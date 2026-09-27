# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-04-09 
# Favorite Color Survey
# Lab 6.1: Favorite Colors Survey
# Description: This program allows a user to record their name and assign their favorite
# color to their name. The name and favorite color are then saved to a text file.
# Everytime the program is ran, it displays all previous entries.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

FILENAME = "favorites.txt"

def survey():
    name = input("Enter your name: ")
    color = input("Enter your favorite color: ")

    with open(FILENAME, "a") as file:
        file.write(f"{name}: {color}\n")

def display():
    print("\nSurvey results so far:\n")
    with open(FILENAME, "r") as file:
        entries = False
        for line in file:
            print(line.strip())
            entries = True
        if not entries:
            print("No entries found.")

def main():
    survey()
    display()

main()
