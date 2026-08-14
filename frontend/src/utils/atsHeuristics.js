const WEAK_VERBS = {
  "responsible for": "Led",
  "helped with": "Contributed to",
  "worked on": "Developed",
  "assisted in": "Supported",
  "participated in": "Collaborated on",
  "was involved in": "Drove",
  "handled": "Managed",
  "did": "Executed",
  "made": "Created",
  "got": "Achieved",
};

const FILLER_PHRASES = [
  "team player",
  "hard worker",
  "detail-oriented",
  "self-starter",
  "think outside the box",
  "go-getter",
  "results-driven",
  "dynamic individual",
  "synergy",
  "proactive",
  "passionate about",
];

const STRONG_VERBS = [
  "managed", "developed", "implemented", "created", "led", "optimized",
  "increased", "reduced", "designed", "architected", "delivered",
  "streamlined", "built", "launched", "spearheaded", "automated",
  "negotiated", "mentored", "transformed", "scaled",
];

const SECTION_HEADERS = {
  "Experience": /(experience|work history|employment|professional)/i,
  "Education": /(education|academic|university|college|degree)/i,
  "Skills": /(skills|technical skills|technologies|competencies)/i,
  "Projects": /(projects|personal projects|portfolio)/i,
  "Contact": /(contact|email|phone|linkedin|address)/i,
  "Summary": /(summary|objective|profile|about)/i,
  "Certifications": /(certifications?|licenses?|credentials)/i,
};

function guessSection(line, allLines) {
  const lineIdx = allLines.findIndex(l => l.trim() === line);
  if (lineIdx === -1) return "General";

  for (let i = lineIdx; i >= Math.max(0, lineIdx - 20); i--) {
    for (const [sectionName, pattern] of Object.entries(SECTION_HEADERS)) {
      if (pattern.test(allLines[i])) {
        return sectionName;
      }
    }
  }
  return "General";
}

export function runClientHeuristics(resumeText, jobDescription = "", previousResults = null) {
  const lines = resumeText.split('\n');
  const wordCount = resumeText.split(/\s+/).filter(w => w.length > 0).length;
  const issues = [];
  let issueId = 0;

  // Track findings
  let weakVerbCount = 0;
  let strongVerbCount = 0;
  let fillerCount = 0;
  let metricCount = 0;

  const textLower = resumeText.toLowerCase();

  // Basic counts for sub-scores
  STRONG_VERBS.forEach(v => {
    if (textLower.includes(v)) strongVerbCount++;
  });

  // Detect Sections
  const sectionsFound = [];
  for (const [section, pattern] of Object.entries(SECTION_HEADERS)) {
    if (pattern.test(resumeText)) {
      sectionsFound.push(section);
    }
  }

  // 1. Weak verb detection
  lines.forEach((line) => {
    const lineStripped = line.trim();
    if (!lineStripped) return;

    for (const [weak, strong] of Object.entries(WEAK_VERBS)) {
      if (lineStripped.toLowerCase().includes(weak)) {
        weakVerbCount++;
        issueId++;
        const suggestion = lineStripped.replace(new RegExp(weak, 'i'), strong);
        issues.push({
          id: `client-issue-${issueId}`,
          type: "weak_verb",
          severity: "warning",
          line_text: lineStripped,
          suggestion: suggestion,
          section: guessSection(lineStripped, lines),
          rule: "weak_verb_detection",
          message: `Weak verb detected: "${weak}". Use a stronger action verb like "${strong}".`,
        });
      }
    }
  });

  // 2. Missing metrics
  lines.forEach((line) => {
    const lineStripped = line.trim();
    if (!lineStripped) return;
    
    const isBullet = /^[-•*–►]/.test(lineStripped) || (lineStripped.length > 20 && STRONG_VERBS.some(v => lineStripped.toLowerCase().includes(v)));
    if (isBullet) {
      const metricPattern = /\d+\s*(%|x|users|clients|revenue|\$|hours|months|projects|team|members|million|billion|k\b)/i;
      const hasMetric = metricPattern.test(lineStripped);
      const hasNumber = /\d+/.test(lineStripped);
      
      if (hasMetric) metricCount++;
      else if (hasNumber) metricCount += 0.5; // partial credit
      else if (lineStripped.length > 30) {
        issueId++;
        issues.push({
          id: `client-issue-${issueId}`,
          type: "missing_metric",
          severity: "error",
          line_text: lineStripped,
          suggestion: lineStripped + " (add specific numbers, e.g., 'reduced load time by 40%')",
          section: guessSection(lineStripped, lines),
          rule: "missing_metric",
          message: "This bullet point lacks quantifiable metrics. Add numbers to strengthen impact.",
        });
      }
    }
  });

  // 3. Filler phrases
  lines.forEach((line) => {
    const lineStripped = line.trim();
    if (!lineStripped) return;

    FILLER_PHRASES.forEach((filler) => {
      if (lineStripped.toLowerCase().includes(filler)) {
        fillerCount++;
        issueId++;
        let cleaned = lineStripped.replace(new RegExp(filler, 'ig'), '').trim();
        cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[,;]\s*|\s*[,;]$/g, '');
        
        issues.push({
          id: `client-issue-${issueId}`,
          type: "filler_phrase",
          severity: "info",
          line_text: lineStripped,
          suggestion: cleaned || "(Remove this line entirely)",
          section: guessSection(lineStripped, lines),
          rule: "filler_detection",
          message: `Generic filler phrase: "${filler}". Replace with specific, measurable achievements.`,
        });
      }
    });
  });

  // 4. Missing Sections (critical ones)
  const coreSections = ["Experience", "Education", "Skills", "Projects", "Contact"];
  coreSections.forEach(sectionName => {
    if (!sectionsFound.includes(sectionName)) {
      issueId++;
      issues.push({
        id: `client-issue-${issueId}`,
        type: "section_missing",
        severity: "error",
        line_text: "",
        suggestion: `Add a clearly labeled '${sectionName}' section to your resume.`,
        section: sectionName,
        rule: "section_completeness",
        message: `Missing or unclear "${sectionName}" section.`,
      });
    }
  });

  // Re-use missing keyword issues from previous results if available
  // Client-side can't easily parse NLP for JD match perfectly without full list,
  // so we carry them over.
  if (previousResults && previousResults.issues) {
    const keywordIssues = previousResults.issues.filter(i => i.type === 'missing_keyword');
    
    keywordIssues.forEach(ki => {
      // Check if they added it
      const matchWord = (ki.message.match(/"([^"]+)"/) || [])[1];
      if (matchWord && !resumeText.toLowerCase().includes(matchWord.toLowerCase())) {
        issueId++;
        issues.push({
          ...ki,
          id: `client-issue-${issueId}`
        });
      }
    });
  }


  // Compute Sub-Scores
  
  // Action Verbs
  let verbScore = Math.min(100, strongVerbCount * 10);
  verbScore -= (weakVerbCount * 12);
  verbScore -= (fillerCount * 8);
  verbScore = Math.max(0, Math.min(100, verbScore));

  // Impact
  const impactScore = Math.min(100, metricCount * 15);

  // Formatting
  let formattingScore = 100;
  if (wordCount < 200) formattingScore -= 30;
  else if (wordCount < 400) formattingScore -= 15;
  else if (wordCount > 1200) formattingScore -= 20;
  else if (wordCount > 1000) formattingScore -= 10;
  formattingScore = Math.max(0, Math.min(100, formattingScore));

  // Section Completeness
  const sectionScore = Math.floor((sectionsFound.length / coreSections.length) * 100);

  // Keyword Match (Carry over from previous result if available, or fake it slightly)
  let keywordScore = 50;
  if (previousResults && previousResults.sub_scores) {
    keywordScore = previousResults.sub_scores.keyword_match;
  }

  // Calculate overall roughly based on weights
  // This is a fast approximation until server replies
  const overallScore = Math.floor(
    (keywordScore * 0.3) +
    (formattingScore * 0.2) +
    (verbScore * 0.2) +
    (impactScore * 0.15) +
    (sectionScore * 0.15)
  );

  return {
    score: overallScore,
    sub_scores: {
      keyword_match: keywordScore,
      formatting: formattingScore,
      action_verbs: verbScore,
      quantified_impact: impactScore,
      section_completeness: Math.min(100, sectionScore),
    },
    issues: issues
  };
}
