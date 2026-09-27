# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-05-03 
# Favorite Colors Survey
# Lab 8: Favorite Colors Survey Part 2
# Description: This program allows a user to record their name and assign their favorite
# color to their name. The name and favorite color are then saved to a text file.
# Everytime the program is ran, it displays all previous entries.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

from pathlib import Path

FILENAME = "favorites.csv"

def survey():
    name = input("Enter your name: ").strip().upper()
    if name == "":
        print("Name cannot be empty.")
        return
    if name_exists(name):
        print(f"\n{name} already exists. Entry not added.")
        return
    color = input("Enter your favorite color: ").strip().lower()
    if color == "":
        print("Color cannot be empty.")
        return
    try:
        with open(FILENAME, "a") as file:
            file.write(f"{name},{color}\n")
    except IOError:
        print("Error: Could not save entry.")

def display():
    print("\nSurvey results so far:\n")
    try:
        with open(FILENAME, "r") as file:
            entries = False
            for line in file:
                line = line.strip()
                if line:
                    parts = line.split(",")
                    name = parts[0]
                    color = parts[1]
                    print(f"{name} likes {color}.")
                    entries = True
            if not entries:
                print("No entries found.")
    except FileNotFoundError:
        print("No entries found.")
    except IOError:
        print("Error: Could not read file.")

def name_exists(name):
    try:
        with open(FILENAME, "r") as file:
            for line in file:
                if line.lower().startswith(name.lower() + ","):
                    return True
    except (FileNotFoundError, IOError):
        return False
    return False

def search_color():
    color = input("\nEnter a color to search for: ").strip().lower()
    if color == "":
        return
    matches = []
    try:
        with open(FILENAME, "r") as file:
            for line in file:
                line = line.strip()
                if line:
                    parts = line.split(",")
                    entry_name = parts[0]
                    entry_color = parts[1]
                    if entry_color == color:
                        matches.append(entry_name)
    except (FileNotFoundError, IOError):
        pass
    if not matches:
        print(f"Nobody likes {color}.")
    else:
        print(f"The following people like {color}: ", end="")
        print(matches[0], end="")
        for match in matches[1:]:
            print(f", {match}", end="")
        print()

def main():
    survey()
    display()
    search_color()

main()
