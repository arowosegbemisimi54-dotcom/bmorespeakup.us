# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-05-10 
# URL Log Analyzer
# Final Coding Project – Cybersecurity: URL Log Analyzer
# Description: This program takes list of URLs from a user selected file to analyze
# them. The program cleans and validates each URL from the list while also detecting
# possible security threats using a set of keywords. Once finished, the program saves
# the URLS to a CSV file, including a summary report on them.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

SUSPICIOUS_KEYWORDS = ["phish", "malware", "hack", "ransom", "trojan", "spyware"]
OUTPUT_FILE = "suspicious_urls.csv"
CSV_HEADER = "Number,URL,Domain,Keyword"

def clean_url(url):
    url = url.strip()       
    url = url.lower()       
    return url

def extract_domain(url):
    protocol_index = url.find("://")

    if protocol_index == -1:
        start_index = 0
    else:
        start_index = protocol_index + 3

    end_index = url.find("/", start_index)

    if end_index == -1:
        domain = url[start_index:]
    else:
        domain = url[start_index:end_index]

    return domain

def is_suspicious(url):
    for keyword in SUSPICIOUS_KEYWORDS:
        if keyword in url:
            return keyword

    return None 

def process_urls(input_file):
    total = 0
    suspicious_tuples = []

    try:
        input_file_handle = open(input_file, "r")
    except FileNotFoundError:
        print(f"Error: The file '{input_file}' was not found.")
        return 0, []
    except PermissionError:
        print(f"Error: Permission denied when trying to open '{input_file}'.")
        return 0, []

    for line in input_file_handle:
        url = clean_url(line)

        if url == "":
            continue

        total += 1  

        keyword = is_suspicious(url)

        if keyword is not None:
            suspicious_tuples.append((url, keyword))

    input_file_handle.close()

    return total, suspicious_tuples

def save_suspicious(suspicious_tuples):
    try:
        with open(OUTPUT_FILE, "w") as out_file:
            out_file.write(f"{CSV_HEADER}\n")

            number = 1
            for url, keyword in suspicious_tuples:
                domain = extract_domain(url)
                out_file.write(f"{number},{url},{domain},{keyword}\n")
                number += 1

    except PermissionError:
        print(f"Error: Permission denied — could not write to '{OUTPUT_FILE}'.")
    except OSError as error:
        print(f"Error: Could not create or write to '{OUTPUT_FILE}': {error}")

def display_report(input_file, total, suspicious_tuples):
    suspicious_count = len(suspicious_tuples)

    print("\nProcessing complete.")
    print("\n=== URL Security Report ===")
    print(f"The file {input_file} contains {total} URLs.")
    print(f"{suspicious_count} suspicious URLs detected:")

    for url, keyword in suspicious_tuples:
        print(f'"{keyword}" found in {url}')

    print(f"\nSuspicious URLs are saved to {OUTPUT_FILE}")

def main():
    input_file = input("Enter the input file name: ")

    total, suspicious_tuples = process_urls(input_file)

    if total > 0:
        save_suspicious(suspicious_tuples)
        display_report(input_file, total, suspicious_tuples)

main()
