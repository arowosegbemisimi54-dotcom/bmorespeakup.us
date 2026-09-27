# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-04-26 
# Student Grades
# Lab 7.2: Student Grades
# Description: This program allows the user to create their input student's grades from a
# text file before organizing them in two columns. The user can then enter a passing grade
# requirement before the program calculates the average grade, shows the highest and lowest
# grades, and who passed the class. Lastly, the program will pick a student of the month
# for the user and reverse the lists.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

import random

FILENAME = "grades.txt"
PASSING_DEFAULT = 77

def read_grades():
    names = []
    grades = []

    with open(FILENAME, "r") as file:
        lines = file.readlines()

    for i in range(0, len(lines), 2):
        names.append(lines[i].strip())
        grades.append(int(lines[i + 1].strip()))

    return names, grades

def display_all(names, grades):
    print("Class Grades:")
    for i in range(len(names)):
        print(f"{names[i]} - {grades[i]}")

def statistics(names, grades, passing_grade):
    avg = sum(grades) / len(grades)
    highest = max(grades)
    lowest = min(grades)

    highest_names = [names[i] for i in range(len(names)) if grades[i] == highest]
    lowest_names = [names[i] for i in range(len(names)) if grades[i] == lowest]

    passing_count = len([g for g in grades if g >= passing_grade])

    print(f"Average: {avg:.3f}")
    print(f"Highest: {highest_names[-1]} ({highest})")
    print(f"Lowest: {lowest_names[-1]} ({lowest})")
    print(f"{passing_count} students passed.")

def top_students(names, grades, n):
    grades_copy = grades[:]
    grades_copy.sort(reverse=True)

    top_grades = grades_copy[:n]

    print(f"\nTop {n} students:")
    for i in range(len(names)):
        if grades[i] in top_grades:
            print(f"{names[i]} - {grades[i]}")
            top_grades.remove(grades[i])  

def passing_grades(grades, passing):
    return [g for g in grades if g >= passing]

def main():
    names, grades = read_grades()

    print()
    display_all(names, grades)

    passing_grade = int(input("\nEnter passing grade: "))

    print()
    statistics(names, grades, passing_grade)

    passing = passing_grades(grades, passing_grade)
    print("\nPassing grades: ", end="")
    for g in passing:
        print(g, end=" ")
    print()

    n = int(input("\nShow top how many students? "))
    top_students(names, grades, n)

    student_of_month = random.choice(names)
    print(f"\nStudent of the month: {student_of_month}")

    print("\nReversing the lists.\n")
    names.reverse()
    grades.reverse()
    display_all(names, grades)


main()
