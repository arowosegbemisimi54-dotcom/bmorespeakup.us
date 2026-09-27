# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-04-22 
# Shopping List
# Lab 7.1: Shopping List
# Description: This program allows the user to create their own shopping
# list, allowing them to add any item they like and remove items after
# finalizing their list. Additionally, if the user is missing specific
# required items, the program will automatically add them to the list.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

MILK = "milk"


def collect_items():

    shopping_list = []

    item = input("Enter an item (blank to finish): ")

    while item != "":
        shopping_list.append(item)
        item = input("Enter an item (blank to finish): ")

    return shopping_list


def display_list(lst):

    if len(lst) == 0:
        print("Your shopping list is empty.")
    else:
        print("\nShopping list:")
        for item in lst:
            print(item)


def add_missing(lst, item):

    if item not in lst:
        print(f"\nYou forgot {item}!")
        lst.append(item)


def remove_item(lst, item):

    if item not in lst:
        print(f"List does not contain {item}")
        return False  
    else:
        lst.remove(item)
        print(f"\n{item} removed.")
        return True 


def main():

    shopping_list = collect_items()

    add_missing(shopping_list, MILK)

    display_list(shopping_list)

    print()
    item_to_remove = input("Enter an item to remove: ")
    removed = remove_item(shopping_list, item_to_remove)

    if removed:
        display_list(shopping_list)


main()
