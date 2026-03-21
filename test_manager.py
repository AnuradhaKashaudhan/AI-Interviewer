from backend.modules.interview_manager import start_interview, next_question, store_answer, generate_final_report

def test_interview_flow():
    print("--- Starting Interview Test ---")
    skills = ["Python", "React", "Docker"]
    questions = start_interview(skills)
    print(f"Generated {len(questions)} questions.")
    
    # Simulate answering the first 3 questions
    for i in range(3):
        q = next_question()
        if q:
            print(f"Question {i+1}: {q}")
            answer = "This is a placeholder answer for testing the flow."
            eval_res = store_answer(q, answer)
            print(f"Score: {eval_res['score']}")
        else:
            break
            
    print("\n--- Generating Final Report ---")
    report = generate_final_report()
    import json
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    try:
        test_interview_flow()
    except Exception as e:
        print(f"Test failed: {e}")
