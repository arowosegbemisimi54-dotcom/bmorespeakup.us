import java.util.Scanner;

public class Assignment3 {
    public static void main (String[]args) {
        
    // add scanner for user to answer prompts
    Scanner input = new Scanner(System.in);
    
    // state variables
    double userItemPrice;
    
    //prompt user for original price 
    System.out.print("Please enter the original retail price of your item: $");
    userItemPrice = input.nextDouble();
    
    // calculate discounted price with the user's input price and print output
    if (userItemPrice <= 50)
    System.out.print("At a 5% discount, the $" + String.format("%.2f", userItemPrice) + 
        " item has a new sale price of $" + String.format("%.2f", userItemPrice - (userItemPrice * .05)) + "!");

    else if (userItemPrice > 50) 
    if (userItemPrice <= 100)
        System.out.println("At a 10% discount, the $" + String.format("%.2f", userItemPrice) + 
            " item has a new sale price of $" + String.format("%.2f", userItemPrice - (userItemPrice * .10)) + "!");

    else if (userItemPrice > 100)
        System.out.println("At a 15% discount, the $" + String.format("%.2f", userItemPrice) + 
            " item has a new sale price of $" + String.format("%.2f", userItemPrice - (userItemPrice * .15)) + "!");
    
    
}
}