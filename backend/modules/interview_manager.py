from typing import Optional
from .question_generator import generate_questions
from .answer_evaluator import evaluate_answer

class InterviewManager:
    """
    Manages the state and flow of a single interview session.
    """
    def __init__(self):
        self.question_list = []
        self.current_index = 0
        self.results = []
        self.persona = "friendly"
        self.audio_cache = {}

    def start_interview(self, resume_skills: list[str], persona: str = "friendly") -> list[str]:
        """
        Generates interview questions and initializes the session.
        """
        self.persona = persona
        raw_data = generate_questions(resume_skills)
        self.question_list = []
        self.audio_cache = {}
        
        # Consolidate all questions into a flat list for sequential access
        # Adding HR Questions
        for q in raw_data.get("hr_questions", []):
            self.question_list.append({"type": "HR", "question": q})
            
        # Adding Technical Questions
        for q_item in raw_data.get("technical_questions", []):
            self.question_list.append({
                "type": "Technical", 
                "question": q_item["question"], 
                "skill": q_item.get("skill")
            })
            
        # Adding Project Based Questions
        for q in raw_data.get("project_based_questions", []):
            self.question_list.append({"type": "Project", "question": q})
            
        self.current_index = 0
        self.results = []
        
        return [q["question"] for q in self.question_list]

    def next_question(self) -> Optional[str]:
        """
        Retrieves the next question in the sequence.
        """
        if self.current_index < len(self.question_list):
            question = self.question_list[self.current_index]["question"]
            self.current_index += 1
            return question
        return None

    def store_answer(self, question: str, answer: str) -> dict:
        """
        Evaluates the answer and stores the result.
        """
        evaluation = evaluate_answer(question, answer)
        
        # Find the question type from the list
        q_type = "General"
        for q in self.question_list:
            if q["question"] == question:
                q_type = q["type"]
                break
                
        self.results.append({
            "question": question,
            "answer": answer,
            "type": q_type,
            "score": evaluation["score"],
            "feedback": evaluation["feedback"]
        })
        return evaluation

    def generate_final_report(self) -> dict:
        """
        Calculates final scores and provides feedback.
        """
        if not self.results:
            return {
                "total_score": 0,
                "technical_score": 0,
                "communication_score": 0,
                "strengths": [],
                "weaknesses": [],
                "recommendations": "No answers provided."
            }
            
        total_score = sum(r["score"] for r in self.results) / len(self.results)
        
        # Calculate sub-scores
        tech_questions = [r["score"] for r in self.results if r["type"] in ["Technical", "Project"]]
        comm_questions = [r["score"] for r in self.results if r["type"] == "HR"]
        
        technical_score = sum(tech_questions) / len(tech_questions) if tech_questions else total_score
        communication_score = sum(comm_questions) / len(comm_questions) if comm_questions else total_score
        
        strengths = []
        weaknesses = []
        
        for r in self.results:
            if r["score"] >= 75:
                strengths.append(r["question"])
            elif r["score"] < 50:
                weaknesses.append(r["question"])
                
        # Simple recommendation engine based on overall performance
        recommendations = ""
        if total_score >= 80:
            recommendations = "Excellent performance! Keep practicing your delivery."
        elif total_score >= 50:
            recommendations = "Good job. Focus on elaborating more on technical details."
        else:
            recommendations = "You may need to review core concepts in the areas marked as weaknesses."
            
        return {
            "total_score": round(total_score, 2),
            "technical_score": round(technical_score, 2),
            "communication_score": round(communication_score, 2),
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "detailed_results": self.results
        }

# Singleton instance to be used across the backend for this prototype
manager = InterviewManager()

def start_interview(resume_skills, persona="friendly"):
    return manager.start_interview(resume_skills, persona)

def next_question():
    return manager.next_question()

def store_answer(question, answer):
    return manager.store_answer(question, answer)

def generate_final_report():
    return manager.generate_final_report()
