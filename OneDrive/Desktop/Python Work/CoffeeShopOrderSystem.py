# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-02-24
# JavaCafe Order System
# Lab 3.1: Coffee Shop Order System
# Description: This program allows the customer to choose their type of drink, drink size,
# and tip amount, before calculating the tax, and giving the customer their total.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

LATTE_SMALL_PRICE = 5.75
LATTE_LARGE_PRICE = 6.75
CAPPUCCINO_SMALL_PRICE = 5.25
CAPPUCCINO_LARGE_PRICE = 6.25

SALES_TAX_RATE = 0.07

DRINK_OPTION_ONE = 1
DRINK_OPTION_TWO = 2

SIZE_OPTION_ONE = 1
SIZE_OPTION_TWO = 2

print("Welcome to JavaCafe Order System\n")

print("DRINK MENU:")
print(f"{DRINK_OPTION_ONE}. Latte")
print(f"{DRINK_OPTION_TWO}. Cappuccino")

drink_choice = int(input(f"Enter your drink choice ({DRINK_OPTION_ONE}-{DRINK_OPTION_TWO}): "))

print("\nSIZE OPTIONS:")
print(f"{SIZE_OPTION_ONE}. Small")
print(f"{SIZE_OPTION_TWO}. Large")

size_choice = int(input(f"Enter size choice ({SIZE_OPTION_ONE}-{SIZE_OPTION_TWO}): "))

tip_amount = float(input("\nEnter tip amount: $"))

if drink_choice == DRINK_OPTION_ONE:
    drink_name = "Latte"
    if size_choice == SIZE_OPTION_ONE:
        drink_cost = LATTE_SMALL_PRICE
        size_name = "Small"
    elif size_choice == SIZE_OPTION_TWO:
        drink_cost = LATTE_LARGE_PRICE
        size_name = "Large"
elif drink_choice == DRINK_OPTION_TWO:
    drink_name = "Cappuccino"
    if size_choice == SIZE_OPTION_ONE:
        drink_cost = CAPPUCCINO_SMALL_PRICE
        size_name = "Small"
    elif size_choice == SIZE_OPTION_TWO:
        drink_cost = CAPPUCCINO_LARGE_PRICE
        size_name = "Large"

sales_tax = drink_cost * SALES_TAX_RATE
total_cost = drink_cost + sales_tax + tip_amount

print("\n--- ORDER SUMMARY ---")
print(f"Drink: {size_name} {drink_name}")
print(f"Drink cost: ${drink_cost:.2f}")
print(f"Sales tax ({SALES_TAX_RATE * 100:.0f}%): ${sales_tax:.2f}")
print(f"Tip: ${tip_amount:.2f}")
print(f"Total cost: ${total_cost:.2f}")

print("\nThank you for your order!")
