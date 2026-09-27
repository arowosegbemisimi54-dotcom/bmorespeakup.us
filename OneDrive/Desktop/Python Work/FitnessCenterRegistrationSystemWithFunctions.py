# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-03-26
# Howard Fitness Center Registration System Part 2
# Lab 5.1: Fitness Center Registration System with Functions
# Description: This program allows fitness center users to enter their name into the
# system, pick the amount of classes they would like, and their choice of yoga or cardio
# as their desired class. Then, the system calculates the user's total for them. This is
# coded with the use of functions this time.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

def display_error(message):
    print(f"Error: {message}")

def get_num_classes():
    num = 0
    while True:
        user_input = input("Enter number of classes (1-5): ")
        if not user_input.isdigit():
            display_error("Number must be between 1 and 5. Please try again!")
        else:
            num = int(user_input)
            if num < 1 or num > 5:
                display_error("Number must be between 1 and 5. Please try again!")
            else:
                break
    return num

def get_customer_name():
    name = ""
    while True:
        name = input("Enter your name: ").strip()
        if name == "":
            display_error("Name cannot be empty. Please try again!")
        else:
            break
    return name

def get_class_type():
    class_type = ""
    while True:
        class_type = input("Enter class type (yoga/cardio): ").lower()
        if class_type != "yoga" and class_type != "cardio":
            display_error("Please enter 'yoga' or 'cardio'. Please try again!")
        else:
            break
    return class_type

def calculate_total(class_type, num_classes):
    total = 0.0
    price = 0.0

    if class_type == "yoga":
        price = 20.0
    else:
        price = 15.0

    print("\nProcessing your registration...\n")

    for i in range(1, num_classes + 1):
        total += price
        print(f"Class {i}: {class_type.capitalize()} - ${price:.2f}")

    return total

def display_results(customer_name, total_cost):
    print(f"\nYour total is: ${total_cost:.2f}\n")
    print(f"Thank you {customer_name}!")

def main():
    print("Welcome to Howard Fitness Center\n")

    num_classes = get_num_classes()
    print()
    customer_name = get_customer_name()
    print()
    class_type = get_class_type()

    total_cost = calculate_total(class_type, num_classes)

    display_results(customer_name, total_cost)

main()
