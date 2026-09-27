# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-03-11
# Howard Fitness Center Registration System
# Lab 4.1: Fitness Center Registration System
# Description: This program allows fitness center users to enter their name into the
# system, pick the amount of classes they would like, and their choice of yoga or cardio
# as their desired class. Then, the system calculates the user's total for them.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

print("Welcome to Howard Fitness Center\n")

num_classes = 0

while num_classes < 1 or num_classes > 5:
    num_classes = int(input("Enter number of classes (1-5): "))
    
    if num_classes < 1 or num_classes > 5:
        print("Error: Number must be between 1 and 5. Please try again!")

name = ""

while name == "":
    name = input("\nEnter your name: ")
    
    if name == "":
        print("Error: Name cannot be empty. Please try again!")

class_type = ""

while class_type != "yoga" and class_type != "cardio":
    class_type = input("\nEnter class type (yoga/cardio): ")
    
    if class_type != "yoga" and class_type != "cardio":
        print("Error: Please enter 'yoga' or 'cardio'. Please try again!")

print("\nProcessing your registration...\n")

price = 0.0

if class_type == "yoga":
    price = 20.00
elif class_type == "cardio":
    price = 15.00

count = 1
total_cost = 0.0

while count <= num_classes:
    
    if class_type == "yoga":
        print(f"Class {count}: Yoga - ${price:.2f}")
    else:
        print(f"Class {count}: Cardio - ${price:.2f}")
    
    total_cost = total_cost + price
    count = count + 1

print(f"\nYour total is: ${total_cost:.2f}")
print(f"\nThank you {name}!")
