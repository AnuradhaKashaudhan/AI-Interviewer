import random

# Curated Coding Question Bank with 12 diverse problems
CODING_QUESTION_BANK = [
    {
        "id": "first_unique_char",
        "title": "First Non-Repeating Character",
        "difficulty": "easy",
        "category": "Strings & Hash Maps",
        "skills": ["Python", "Javascript", "Java", "C++", "C", "Backend", "Full Stack", "Data Analyst"],
        "question_text": "Given a string `s`, find the first non-repeating character in it and return its index (0-indexed) or character representation. If no non-repeating character exists, return `-1`.\n\n### Constraints:\n- 1 <= s.length <= 10^5\n- `s` consists of lowercase English letters.",
        "starter_code": {
            "python": """def first_uniq_char(s: str) -> str:
    # Write your solution here
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for char in s:
        if counts[char] == 1:
            return char
    return "-1"

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print(first_uniq_char(input_str))
""",
            "cpp": """#include <iostream>
#include <string>
#include <unordered_map>

std::string firstUniqChar(std::string s) {
    std::unordered_map<char, int> counts;
    for (char c : s) counts[c]++;
    for (char c : s) {
        if (counts[c] == 1) return std::string(1, c);
    }
    return "-1";
}

int main() {
    std::string s;
    if (std::cin >> s) {
        std::cout << firstUniqChar(s) << std::endl;
    }
    return 0;
}
""",
            "java": """import java.util.Scanner;
import java.util.HashMap;

public class Main {
    public static String firstUniqChar(String s) {
        HashMap<Character, Integer> counts = new HashMap<>();
        for (char c : s.toCharArray()) {
            counts.put(c, counts.getOrDefault(c, 0) + 1);
        }
        for (char c : s.toCharArray()) {
            if (counts.get(c) == 1) return String.valueOf(c);
        }
        return "-1";
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            String s = scanner.next();
            System.out.println(firstUniqChar(s));
        }
    }
}
""",
            "c": """#include <stdio.h>
#include <string.h>

int main() {
    char s[1000];
    if (scanf("%s", s) == 1) {
        int counts[256] = {0};
        int len = strlen(s);
        for (int i = 0; i < len; i++) counts[(unsigned char)s[i]]++;
        for (int i = 0; i < len; i++) {
            if (counts[(unsigned char)s[i]] == 1) {
                printf("%c\n", s[i]);
                return 0;
            }
        }
        printf("-1\n");
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "leetcode", "expected": "l", "explanation": "'l' is the first character that appears only once."},
            {"input": "loveleetcode", "expected": "v", "explanation": "'v' is the first character that appears only once."}
        ],
        "hidden_test_cases": [
            {"input": "aabbcc", "expected": "-1"},
            {"input": "racecar", "expected": "e"},
            {"input": "z", "expected": "z"},
            {"input": "abcdefg", "expected": "a"},
            {"input": "aabccbd", "expected": "d"}
        ]
    },
    {
        "id": "valid_palindrome",
        "title": "Valid Palindrome",
        "difficulty": "easy",
        "category": "Strings & Two Pointers",
        "skills": ["Python", "Javascript", "Java", "C++", "C", "Frontend", "Full Stack"],
        "question_text": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
        "starter_code": {
            "python": """def is_palindrome(s: str) -> bool:
    # Write your solution here
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    result = is_palindrome(input_str)
    print("true" if result else "false")
""",
            "cpp": """#include <iostream>
#include <string>
#include <cctype>

bool isPalindrome(std::string s) {
    std::string cleaned = "";
    for (char c : s) {
        if (std::isalnum(c)) cleaned += std::tolower(c);
    }
    int l = 0, r = cleaned.length() - 1;
    while (l < r) {
        if (cleaned[l++] != cleaned[r--]) return false;
    }
    return true;
}

int main() {
    std::string s;
    std::getline(std::cin, s);
    std::cout << (isPalindrome(s) ? "true" : "false") << std::endl;
    return 0;
}
""",
            "java": """import java.util.Scanner;

public class Main {
    public static boolean isPalindrome(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                sb.append(Character.toLowerCase(c));
            }
        }
        String cleaned = sb.toString();
        String rev = sb.reverse().toString();
        return cleaned.equals(rev);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNextLine() ? scanner.nextLine() : "";
        System.out.println(isPalindrome(s) ? "true" : "false");
    }
}
""",
            "c": """#include <stdio.h>
#include <string.h>
#include <cctype>
#include <stdbool.h>

bool isPalindrome(char* s) {
    int l = 0, r = strlen(s) - 1;
    while (l < r) {
        while (l < r && !isalnum((unsigned char)s[l])) l++;
        while (l < r && !isalnum((unsigned char)s[r])) r--;
        if (tolower((unsigned char)s[l]) != tolower((unsigned char)s[r])) return false;
        l++; r--;
    }
    return true;
}

int main() {
    char s[1000];
    if (fgets(s, sizeof(s), stdin)) {
        s[strcspn(s, "\\n")] = 0;
        printf("%s\\n", isPalindrome(s) ? "true" : "false");
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "A man, a plan, a canal: Panama", "expected": "true", "explanation": "'amanaplanacanalpanama' is a palindrome."},
            {"input": "race a car", "expected": "false", "explanation": "'raceacar' is not a palindrome."}
        ],
        "hidden_test_cases": [
            {"input": " ", "expected": "true"},
            {"input": "0P", "expected": "false"},
            {"input": "Was it a car or a cat I saw?", "expected": "true"},
            {"input": "No 'x' in Nixon", "expected": "true"},
            {"input": "hello world", "expected": "false"}
        ]
    },
    {
        "id": "two_sum_indices",
        "title": "Two Sum",
        "difficulty": "easy",
        "category": "Arrays & Searching",
        "skills": ["Python", "Javascript", "Java", "C++", "C", "Backend", "Full Stack"],
        "question_text": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\nInputs are formatted as a line of space-separated integers for `nums`, followed by `target` on the next line.",
        "starter_code": {
            "python": """def two_sum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) >= 2:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1].strip())
        res = two_sum(nums, target)
        print(" ".join(map(str, res)))
""",
            "cpp": """#include <iostream>
#include <vector>
#include <unordered_map>
#include <sstream>

int main() {
    std::string line;
    if (std::getline(std::cin, line)) {
        std::stringstream ss(line);
        std::vector<int> nums;
        int val;
        while (ss >> val) nums.push_back(val);
        int target;
        std::cin >> target;
        
        std::unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int diff = target - nums[i];
            if (seen.count(diff)) {
                std::cout << seen[diff] << " " << i << std::endl;
                return 0;
            }
            seen[nums[i]] = i;
        }
    }
    return 0;
}
""",
            "java": """import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String[] parts = sc.nextLine().trim().split("\\\\s+");
            int[] nums = new int[parts.length];
            for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
            int target = sc.nextInt();

            Map<Integer, Integer> map = new HashMap<>();
            for (int i = 0; i < nums.length; i++) {
                int diff = target - nums[i];
                if (map.containsKey(diff)) {
                    System.out.println(map.get(diff) + " " + i);
                    return;
                }
                map.put(nums[i], i);
            }
        }
    }
}
""",
            "c": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char line[1000];
    if (fgets(line, sizeof(line), stdin)) {
        int nums[500];
        int count = 0;
        char* token = strtok(line, " \\n");
        while (token != NULL) {
            nums[count++] = atoi(token);
            token = strtok(NULL, " \\n");
        }
        int target;
        if (scanf("%d", &target) == 1) {
            for (int i = 0; i < count; i++) {
                for (int j = i + 1; j < count; j++) {
                    if (nums[i] + nums[j] == target) {
                        printf("%d %d\\n", i, j);
                        return 0;
                    }
                }
            }
        }
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "2 7 11 15\n9", "expected": "0 1", "explanation": "nums[0] + nums[1] == 9, so indices 0 1 returned."},
            {"input": "3 2 4\n6", "expected": "1 2", "explanation": "nums[1] + nums[2] == 6."}
        ],
        "hidden_test_cases": [
            {"input": "3 3\n6", "expected": "0 1"},
            {"input": "1 5 3 7 9\n12", "expected": "2 4"},
            {"input": "-1 -2 -3 -4 -5\n-8", "expected": "2 4"},
            {"input": "10 20 30 40 50\n90", "expected": "3 4"},
            {"input": "0 4 3 0\n0", "expected": "0 3"}
        ]
    },
    {
        "id": "max_subarray_kadane",
        "title": "Maximum Subarray Sum",
        "difficulty": "medium",
        "category": "Dynamic Programming & Greedy",
        "skills": ["Python", "C++", "Java", "Backend", "Machine Learning", "Data Analyst"],
        "question_text": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\nInput is a space-separated list of integers on stdin.",
        "starter_code": {
            "python": """def max_sub_array(nums: list[int]) -> int:
    # Write your Kadane's algorithm solution here
    max_sum = current_sum = nums[0]
    for x in nums[1:]:
        current_sum = max(x, current_sum + x)
        max_sum = max(max_sum, current_sum)
    return max_sum

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    if input_str:
        nums = list(map(int, input_str.split()))
        print(max_sub_array(nums))
""",
            "cpp": """#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int val;
    std::vector<int> nums;
    while (std::cin >> val) nums.push_back(val);
    if (nums.empty()) return 0;
    
    int max_sum = nums[0], curr_sum = nums[0];
    for (size_t i = 1; i < nums.size(); i++) {
        curr_sum = std::max(nums[i], curr_sum + nums[i]);
        max_sum = std::max(max_sum, curr_sum);
    }
    std::cout << max_sum << std::endl;
    return 0;
}
""",
            "java": """import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<Integer> nums = new ArrayList<>();
        while (sc.hasNextInt()) nums.add(sc.nextInt());
        if (nums.isEmpty()) return;

        int maxSum = nums.get(0), currSum = nums.get(0);
        for (int i = 1; i < nums.size(); i++) {
            currSum = Math.max(nums.get(i), currSum + nums.get(i));
            maxSum = Math.max(maxSum, currSum);
        }
        System.out.println(maxSum);
    }
}
""",
            "c": """#include <stdio.h>

int main() {
    int val;
    int nums[1000];
    int count = 0;
    while (scanf("%d", &val) == 1) {
        nums[count++] = val;
    }
    if (count == 0) return 0;
    int max_sum = nums[0], curr_sum = nums[0];
    for (int i = 1; i < count; i++) {
        if (curr_sum < 0) curr_sum = nums[i];
        else curr_sum += nums[i];
        if (curr_sum > max_sum) max_sum = curr_sum;
    }
    printf("%d\\n", max_sum);
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected": "6", "explanation": "Subarray [4,-1,2,1] has the largest sum = 6."},
            {"input": "1", "expected": "1", "explanation": "Subarray [1] has sum 1."}
        ],
        "hidden_test_cases": [
            {"input": "5 4 -1 7 8", "expected": "23"},
            {"input": "-1 -2 -3 -4", "expected": "-1"},
            {"input": "-2 -1", "expected": "-1"},
            {"input": "10 -2 3 -4 5", "expected": "12"},
            {"input": "1 2 3 4 5", "expected": "15"}
        ]
    },
    {
        "id": "valid_parentheses",
        "title": "Valid Parentheses",
        "difficulty": "easy",
        "category": "Stack & Parsing",
        "skills": ["Python", "Javascript", "Java", "C++", "C", "Frontend", "Full Stack"],
        "question_text": "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.",
        "starter_code": {
            "python": """def is_valid(s: str) -> bool:
    # Write your stack-based solution here
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return len(stack) == 0

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print("true" if is_valid(input_str) else "false")
""",
            "cpp": """#include <iostream>
#include <string>
#include <stack>

bool isValid(std::string s) {
    std::stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) return false;
            char top = st.top();
            st.pop();
            if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false;
        }
    }
    return st.empty();
}

int main() {
    std::string s;
    if (std::cin >> s) {
        std::cout << (isValid(s) ? "true" : "false") << std::endl;
    }
    return 0;
}
""",
            "java": """import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNext() ? sc.next() : "";
        System.out.println(isValid(s) ? "true" : "false");
    }
}
""",
            "c": """#include <stdio.h>
#include <string.h>
#include <stdbool.h>

bool isValid(char* s) {
    char stack[1000];
    int top = -1;
    for (int i = 0; s[i] != '\\0'; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) return false;
            char t = stack[top--];
            if (c == ')' && t != '(') return false;
            if (c == '}' && t != '{') return false;
            if (c == ']' && t != '[') return false;
        }
    }
    return top == -1;
}

int main() {
    char s[1000];
    if (scanf("%s", s) == 1) {
        printf("%s\\n", isValid(s) ? "true" : "false");
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "()[]{}", "expected": "true", "explanation": "All brackets match in correct order."},
            {"input": "(]", "expected": "false", "explanation": "'(' closed by ']' is invalid."}
        ],
        "hidden_test_cases": [
            {"input": "({[]})", "expected": "true"},
            {"input": "([)]", "expected": "false"},
            {"input": "]", "expected": "false"},
            {"input": "((()", "expected": "false"},
            {"input": "{[]}", "expected": "true"}
        ]
    },
    {
        "id": "binary_search_index",
        "title": "Binary Search",
        "difficulty": "easy",
        "category": "Searching & Algorithms",
        "skills": ["Python", "C++", "Java", "C", "Backend", "AI"],
        "question_text": "Given a sorted array of distinct integers `nums` and a target value `target`, return the index of `target` if it exists. Otherwise, return `-1`.\nInput format: line 1 has space-separated integers `nums`, line 2 has integer `target`.",
        "starter_code": {
            "python": """def search(nums: list[int], target: int) -> int:
    # Write O(log N) binary search solution here
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1

if __name__ == "__main__":
    import sys
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) >= 2:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1].strip())
        print(search(nums, target))
""",
            "cpp": """#include <iostream>
#include <vector>
#include <sstream>

int search(const std::vector<int>& nums, int target) {
    int l = 0, r = nums.size() - 1;
    while (l <= r) {
        int mid = l + (r - l) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) l = mid + 1;
        else r = mid - 1;
    }
    return -1;
}

int main() {
    std::string line;
    if (std::getline(std::cin, line)) {
        std::stringstream ss(line);
        std::vector<int> nums;
        int val, target;
        while (ss >> val) nums.push_back(val);
        if (std::cin >> target) {
            std::cout << search(nums, target) << std::endl;
        }
    }
    return 0;
}
""",
            "java": """import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String[] parts = sc.nextLine().trim().split("\\\\s+");
            int[] nums = new int[parts.length];
            for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
            int target = sc.nextInt();

            int l = 0, r = nums.length - 1;
            int ans = -1;
            while (l <= r) {
                int mid = l + (r - l) / 2;
                if (nums[mid] == target) { ans = mid; break; }
                else if (nums[mid] < target) l = mid + 1;
                else r = mid - 1;
            }
            System.out.println(ans);
        }
    }
}
""",
            "c": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char line[1000];
    if (fgets(line, sizeof(line), stdin)) {
        int nums[500];
        int count = 0;
        char* token = strtok(line, " \\n");
        while (token != NULL) {
            nums[count++] = atoi(token);
            token = strtok(NULL, " \\n");
        }
        int target;
        if (scanf("%d", &target) == 1) {
            int l = 0, r = count - 1;
            int ans = -1;
            while (l <= r) {
                int mid = l + (r - l) / 2;
                if (nums[mid] == target) { ans = mid; break; }
                else if (nums[mid] < target) l = mid + 1;
                else r = mid - 1;
            }
            printf("%d\\n", ans);
        }
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "-1 0 3 5 9 12\n9", "expected": "4", "explanation": "9 exists in nums and its index is 4."},
            {"input": "-1 0 3 5 9 12\n2", "expected": "-1", "explanation": "2 does not exist in nums so return -1."}
        ],
        "hidden_test_cases": [
            {"input": "5\n5", "expected": "0"},
            {"input": "2 5\n5", "expected": "1"},
            {"input": "1 3 5 7 9 11\n1", "expected": "0"},
            {"input": "1 3 5 7 9 11\n11", "expected": "5"},
            {"input": "10 20 30 40 50\n25", "expected": "-1"}
        ]
    },
    {
        "id": "climbing_stairs_dp",
        "title": "Climbing Stairs",
        "difficulty": "easy",
        "category": "Dynamic Programming",
        "skills": ["Python", "C++", "Java", "Backend", "Machine Learning"],
        "question_text": "You are climbing a staircase. It takes `n` steps to reach the top.\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\nInput is an integer `n` on stdin.",
        "starter_code": {
            "python": """def climb_stairs(n: int) -> int:
    # Write your solution here
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    if input_str:
        print(climb_stairs(int(input_str)))
""",
            "cpp": """#include <iostream>

int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

int main() {
    int n;
    if (std::cin >> n) {
        std::cout << climbStairs(n) << std::endl;
    }
    return 0;
}
""",
            "java": """import java.util.Scanner;

public class Main {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            System.out.println(climbStairs(sc.nextInt()));
        }
    }
}
""",
            "c": """#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        if (n <= 2) {
            printf("%d\\n", n);
            return 0;
        }
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        printf("%d\\n", b);
    }
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "2", "expected": "2", "explanation": "1 step + 1 step OR 2 steps."},
            {"input": "3", "expected": "3", "explanation": "1+1+1, 1+2, 2+1."}
        ],
        "hidden_test_cases": [
            {"input": "1", "expected": "1"},
            {"input": "4", "expected": "5"},
            {"input": "5", "expected": "8"},
            {"input": "6", "expected": "13"},
            {"input": "10", "expected": "89"}
        ]
    },
    {
        "id": "contains_duplicate",
        "title": "Contains Duplicate",
        "difficulty": "easy",
        "category": "Arrays & Hash Set",
        "skills": ["Python", "Javascript", "Java", "C++", "C", "Backend"],
        "question_text": "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.\nInput is a space-separated list of integers on stdin.",
        "starter_code": {
            "python": """def contains_duplicate(nums: list[int]) -> bool:
    # Write your solution here
    return len(nums) != len(set(nums))

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    if input_str:
        nums = list(map(int, input_str.split()))
        print("true" if contains_duplicate(nums) else "false")
""",
            "cpp": """#include <iostream>
#include <vector>
#include <unordered_set>

int main() {
    int val;
    std::unordered_set<int> seen;
    bool dup = false;
    while (std::cin >> val) {
        if (seen.count(val)) dup = true;
        seen.insert(val);
    }
    std::cout << (dup ? "true" : "false") << std::endl;
    return 0;
}
""",
            "java": """import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Set<Integer> set = new HashSet<>();
        boolean dup = false;
        while (sc.hasNextInt()) {
            int v = sc.nextInt();
            if (set.contains(v)) dup = true;
            set.add(v);
        }
        System.out.println(dup ? "true" : "false");
    }
}
""",
            "c": """#include <stdio.h>
#include <stdbool.h>

int main() {
    int nums[1000];
    int val, count = 0;
    while (scanf("%d", &val) == 1) nums[count++] = val;
    bool dup = false;
    for (int i = 0; i < count; i++) {
        for (int j = i + 1; j < count; j++) {
            if (nums[i] == nums[j]) { dup = true; break; }
        }
        if (dup) break;
    }
    printf("%s\\n", dup ? "true" : "false");
    return 0;
}
"""
        },
        "sample_test_cases": [
            {"input": "1 2 3 1", "expected": "true", "explanation": "1 appears twice."},
            {"input": "1 2 3 4", "expected": "false", "explanation": "All elements are distinct."}
        ],
        "hidden_test_cases": [
            {"input": "1 1 1 3 3 4 3 2 4 2", "expected": "true"},
            {"input": "10 20 30 40 50", "expected": "false"},
            {"input": "0", "expected": "false"},
            {"input": "9 9", "expected": "true"},
            {"input": "-1 -2 -3 -1", "expected": "true"}
        ]
    }
]


class SessionCodingQuestionTracker:
    """In-memory session asked question tracker to prevent repetitions."""
    def __init__(self):
        self._session_asked = {}

    def get_asked(self, session_id: str) -> set:
        return self._session_asked.get(session_id, set())

    def mark_asked(self, session_id: str, question_id: str):
        if session_id not in self._session_asked:
            self._session_asked[session_id] = set()
        self._session_asked[session_id].add(question_id)


_TRACKER = SessionCodingQuestionTracker()


def select_coding_question(session_id: str, role: str = "", skills: list[str] = None) -> dict:
    """
    Selects a coding problem matching candidate role/skills, excluding previously asked questions in this session.
    """
    skills = skills or []
    asked_ids = _TRACKER.get_asked(session_id)
    
    # 1. Filter out already asked questions
    unasked = [q for q in CODING_QUESTION_BANK if q["id"] not in asked_ids]
    if not unasked:
        # Reset if all bank questions have been asked in this long session
        _TRACKER._session_asked[session_id] = set()
        unasked = CODING_QUESTION_BANK

    # 2. Score questions based on skill/role keyword overlaps
    role_norm = role.lower() if role else ""
    skills_norm = [s.lower() for s in skills]

    scored = []
    for q in unasked:
        score = 0
        q_skills_norm = [s.lower() for s in q["skills"]]
        for s in skills_norm:
            if s in q_skills_norm:
                score += 2
        for s in q_skills_norm:
            if s in role_norm:
                score += 1
        scored.append((score, q))

    # Sort by match score descending with a random shuffle among equal scores
    scored.sort(key=lambda x: x[0] + random.random(), reverse=True)
    selected_question = scored[0][1]

    # Mark question as asked for this session
    _TRACKER.mark_asked(session_id, selected_question["id"])
    return selected_question


def get_question_by_id(question_id: str) -> dict:
    """Retrieves a question definition by its unique ID."""
    for q in CODING_QUESTION_BANK:
        if q["id"] == question_id:
            return q
    # Default fallback to first question if ID not found
    return CODING_QUESTION_BANK[0]
