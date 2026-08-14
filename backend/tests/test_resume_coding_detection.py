from backend.modules.resume_parser import detect_coding_round_recommendation


def test_detects_programming_signal_from_resume_and_role():
    resume_text = """
    Software Engineer with 4 years building scalable backend services.
    Implemented DSA-heavy services and optimized algorithms for performance.
    Skills: Python, Java, C++, Data Structures, Algorithms, LeetCode.
    """

    result = detect_coding_round_recommendation(
        resume_text=resume_text,
        role="Backend Developer",
        skills=["Python", "Algorithms"],
    )

    assert result["enabled"] is True
    assert "coding" in result["reason"].lower()


def test_skips_coding_for_non_technical_resume():
    resume_text = """
    Product Manager with experience in operations, cross-functional leadership,
    and recruiting candidates for product teams.
    """

    result = detect_coding_round_recommendation(
        resume_text=resume_text,
        role="Product Manager",
        skills=["Leadership", "Recruiting"],
    )

    assert result["enabled"] is False
    assert result["reason"] == "No programming or DSA background detected."
