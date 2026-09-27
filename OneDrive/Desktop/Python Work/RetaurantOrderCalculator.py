# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-02-15
# Howard Community College Restaurant
# Lab 2.2: Retaurant Order Calculator
# Description: This program enables the cashier to enter a customer's meal choice,cost,and beverage cost. It calculates sales tax,tip,the total amount due and prints a receipt.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

SALES_TAX_RATE = 0.06
TIP_RATE = 0.18
print("Welcome to Howard Community College Restaurant\n")
meal_choice = input("Enter the meal choice:")
meal_cost = float(input("Enter the cost of the meal in dollars: $"))
beverage_cost = float(input("Enter the cost of the beverage in dollars: $\n"))
combined_cost = meal_cost + beverage_cost
sales_tax = combined_cost * SALES_TAX_RATE
tip_amount = combined_cost * TIP_RATE
total_amount_due = combined_cost + sales_tax + tip_amount
print("\nReceipt:")
print(f"The meal ordered is: {meal_choice}")
print(f"The meal cost is: ${meal_cost:.2f}")
print(f"The beverage cost is: ${beverage_cost:.2f}")
print(f"The sales tax is: ${sales_tax:.2f}")
print(f"The tip amount is: ${tip_amount:.2f}")
print(f"The total amount due is: ${total_amount_due:.2f}")
