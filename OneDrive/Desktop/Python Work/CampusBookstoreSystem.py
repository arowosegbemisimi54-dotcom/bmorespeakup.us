# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-03-01
# Campus Bookstore Order System
# Lab 3.2: Campus Bookstore System
# Description: This program allows the customer to choose the type of book, how many books,
# they want, and their membership level. The program then calculates the total plus tax
# without allowing invalid inputs.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

TEXTBOOK_PRICE = 25.00
NOVEL_PRICE = 16.00
PREMIUM_DISCOUNT = 0.25
REGULAR_DISCOUNT = 0.10
TAX_RATE = 0.06

print("Welcome to Campus Bookstore\n")

print("BOOK TYPES:\n")
print("1. Textbook ($25.00)")
print("2. Novel ($16.00)\n")

book_type = int(input("Enter your book type (1-2) : "))

if book_type == 1:
    book_name = "Textbook"
    price_per_book = TEXTBOOK_PRICE
elif book_type == 2:
    book_name = "Novel"
    price_per_book = NOVEL_PRICE
else:
    print("\nInvalid book type selection")
    print("\nThank you for using the Campus Bookstore!")
    exit()

quantity = int(input("\nEnter quantity: "))

if quantity <= 0:
    print("\nInvalid quantity")
    print("\nThank you for using the Campus Bookstore!")
    exit()

print("\nMEMBERSHIP TYPE:\n")
print("1. Premium Member (25% discount on 3+ books)")
print("2. Regular Customer (10% discount on 3+ books)\n")

membership_type = int(input("Enter membership type (1-2) : "))

if membership_type != 1 and membership_type != 2:
    print("\nInvalid membership type selected")
    print("\nThank you for using the Campus Bookstore!")
    exit()

subtotal = price_per_book * quantity

if quantity >= 3:
    if membership_type == 1:
        discount_rate = PREMIUM_DISCOUNT
        discount_label = "Premium customer discount (25%)"
    else:
        discount_rate = REGULAR_DISCOUNT
        discount_label = "Regular customer discount (10%)"
else:
    discount_rate = 0

discount_amount = subtotal * discount_rate
discounted_total = subtotal - discount_amount
sales_tax = discounted_total * TAX_RATE
total_cost = discounted_total + sales_tax

if quantity == 1:
    book_word = "book"
else:
    book_word = "books"

print("\n-Order Summary\n")
print(f"Book type: {book_name}")
print(f"Number of books: {quantity} {book_word}")
print(f"Price per book: ${price_per_book:.2f}")
print(f"Books subtotal: ${subtotal:.2f}")

if discount_rate > 0:
    print(f"{discount_label} : -${discount_amount:.2f}")
    print(f"Discounted total: ${discounted_total:.2f}")

print(f"Sales tax (6%) : ${sales_tax:.2f}")
print(f"Total cost: ${total_cost:.2f}")

print("\nThank you for using the Campus Bookstore!")
