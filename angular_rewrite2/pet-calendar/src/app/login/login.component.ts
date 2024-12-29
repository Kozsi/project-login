// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  message: string | null = null;

  // Simulate login logic (can be replaced with real backend API calls)
  onSubmit() {
    if (this.username === 'admin' && this.password === 'admin') {
      this.message = 'Login successful!';
      // Handle further logic, like redirecting or fetching user data
    } else {
      this.message = 'Invalid username or password.';
    }

    // Reset form fields after submission
    this.username = '';
    this.password = '';
  }
}
