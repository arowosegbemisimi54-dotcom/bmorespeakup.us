# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-03-15
# Multiplication Tables
# Lab 4.2: Multiplication Table Generator
# Description: This program generates multiplication tables, multiplying the user's choice
# of number times 1-12. After creating the user's desired amount of tables, a summary is
# displayed showing how many tables were generated in total.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

print("Welcome to the Multiplication Table Generator\n")

tables_generated = 0
continue_choice = "y"

while continue_choice == "y" or continue_choice == "Y":

    starting_number = 0

    while starting_number < 1:
        starting_number = int(input("Enter starting number (1 or greater): "))

        if starting_number < 1:
            print("Error: Starting number must be 1 or greater. Please try again!")

    print(f"\nMultiplication Table for {starting_number}:")

    for multiplier in range(1, 13):
        result = starting_number * multiplier
        print(f"{starting_number:>2} x {multiplier:>2} = {result:>3}")

    tables_generated = tables_generated + 1

    print()

    continue_choice = ""

    while continue_choice != "y" and continue_choice != "Y" and continue_choice != "n" and continue_choice != "N":
        continue_choice = input("Do you want to generate another table? (y/n): ")

        if continue_choice != "y" and continue_choice != "Y" and continue_choice != "n" and continue_choice != "N":
            print("Error: Please enter 'y', 'Y', 'n', or 'N'. Please try again!")

    print()

print("=== SUMMARY ===")
print(f"Tables generated: {tables_generated}")

print("\nThank you for using the Multiplication Table Generator!")
