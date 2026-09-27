# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-04-11 
# Sales Report Generator
# Lab 6.2: Sales Report Generator
# Description: This program reads data from a file and then takes this data
# and turns it into information for the user to read. It will validate the
# data and any invalid data will be logged to an error file. A summary
# report is generated before the program finishes.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

INPUT_FILE = "sales_data.txt"
ERROR_FILE = "sales_errors.txt"

def process_line(line, error_file):

    stripped = line.strip()

    try:
        value = float(stripped)
        if value < 0:
            error_file.write(f"{stripped}\n")
            return None
        return value
    except ValueError:
        error_file.write(f"{stripped}\n")
        return None

def process_file():

    count = 0
    total = 0.0
    highest = 0.0

    try:
        with open(INPUT_FILE, "r") as in_file, open(ERROR_FILE, "w") as err_file:
            line = in_file.readline()
            while line != "":
                result = process_line(line, err_file)
                if result is not None:
                    count += 1
                    total += result
                    if result > highest:
                        highest = result
                line = in_file.readline()
    except FileNotFoundError:
        print(f"Error: '{INPUT_FILE}' was not found.")
    except IOError:
        print(f"Error: Could not read '{INPUT_FILE}'.")

    return count, total, highest

def report(total, count, high):

    print()
    if count == 0:
        print("No valid sales entries were found.")
    else:
        average = total / count
        print(f"{count} valid entries")
        print(f"Total sales: ${total:,.2f}")
        print(f"Average sale: ${average:,.2f}")
        print(f"Highest sale: ${high:,.2f}")

def main():

    print("Processing sales data...")

    count, total, highest = process_file()

    report(total, count, highest)

    print(f"\nInvalid lines saved to {ERROR_FILE}")


main()
