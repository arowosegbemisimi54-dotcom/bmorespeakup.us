// Section 02
// 9/3/26
// Prof B
// Age Calculator

import java.util.Scanner;

public class ClassExercise1 {
    public static void main (String[]args) {
        Scanner input = new Scanner(System.in);
        
        //ask user to enter their firstname
        System.out.print("Please enter your first name: ");
        String firstName = input.nextLine();
        //ask user to enter their dob month
        System.out.print("Please enter your DOB month: ");
        int userdobMonth = input.nextInt();
        //ask user to enter their dob day
        System.out.print("Please enter your DOB day: ");
        int userdobDay = input.nextInt();
        //ask user to enter their dob year
        System.out.print("Please enter your DOB year: ");
        int userdobYear = input.nextInt();
        //save current year and userage as integers
        Integer currentyear;
        Integer userage;
        currentyear = 2026;
        // calucation equation for userage
        userage = currentyear - userdobYear;
        //print final message with calculated age
        System.out.println();
        System.out.print("Hello " + firstName + "!\n"+
        ""+firstName+", your birthday is "+userdobMonth+"/"+userdobDay+"/"+userdobYear+" and you are approximately "+userage+" years old.");
        
    }
}
