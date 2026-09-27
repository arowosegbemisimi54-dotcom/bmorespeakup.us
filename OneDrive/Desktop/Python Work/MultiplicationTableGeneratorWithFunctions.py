# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-03-28
# Multiplication Table Generator
# Lab 5.2: Multiplication Table Generator with Functions
# Description: This program generates multiplication tables, multiplying the user's choice
# of number times 1-12. After creating the user's desired amount of tables, a summary is
# displayed showing how many tables were generated in total. This program is made through
# the use of functions this time.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

def display_error(message):
    print(f"Error: {message}")

def get_valid_number():
    while True:
        number = int(input("Enter starting number (1 or greater): "))
        if number >= 1:
            return number
        else:
            display_error("Starting number must be 1 or greater. Please try again!")

def generate_table(number):
    print(f"\nMultiplication Table for {number}:")
    for i in range(1, 13):
        result = number * i
        print(f"{number} x {i:2} = {result:3}")

def get_continue_choice():
    while True:
        choice = input("\nDo you want to generate another table? (y/n): ")
        if choice in ("y", "Y", "n", "N"):
            return choice
        else:
            display_error("Invalid input. Please enter y, Y, n, or N.")

def display_summary(count):
    print("\n=== SUMMARY ===")
    print(f"Tables generated: {count}")
    print("\nThank you for using the Multiplication Table Generator!")

def main():
    print("Welcome to the Multiplication Table Generator\n")

    tables_count = 0
    keep_going = True

    while keep_going:
        number = get_valid_number()
        generate_table(number)
        tables_count = tables_count + 1

        choice = get_continue_choice()
        if choice in ("n", "N"):
            keep_going = False

    display_summary(tables_count)

main()
