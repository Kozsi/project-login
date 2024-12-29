// sidebar.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  constructor(private router: Router) { }

  logout(): void {
    // Logic to log out the user, e.g., clear local storage/session storage
    localStorage.removeItem('user');
    // Navigate to the login page or home page after logout
    this.router.navigate(['/login']);
  }
}
