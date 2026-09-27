# Copyright 2025 Howard Community College All rights reserved; Unauthorized duplication prohibited.
# Programmer name: Miles B. Reinders
# Date: 2026-02-12
# CMSY 156 Music Tracker
# Lab 2.1: Music Playlist Tracker
# Description: This program collects playlist information and calculates average song length, average songs per artist, and average minutes per artist.
# I Miles B. Reinders certify this file is my work. I did not use AI at any step of developing, modifying or debugging this code.

print("Welcome to the CMSY 156 Music Tracker\n")
total_songs = int(input("Enter the total number of songs:"))
total_minutes = int(input("Enter the total minutes of music:"))
total_artists = int(input("Enter the total number of artists:"))
average_song_length = total_minutes / total_songs
average_songs_per_artist = total_songs / total_artists
average_minutes_per_artist = total_minutes / total_artists
print("\nYour average song length is:", average_song_length, "minutes")
print("Your average songs per artist is:", average_songs_per_artist)
print("Your average minutes per artist is:", average_minutes_per_artist)
print("\nThanks for using the Music Tracker!")
