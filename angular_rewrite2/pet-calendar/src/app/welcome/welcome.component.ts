import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent {
  // Simulated user object (replace this with actual data from a service or API)
  user = { username: 'null' }; // Set to `null` if the user is not logged in

  constructor(private router: Router) {}

  goTo(path: string) {
    this.router.navigateByUrl(path);
  }
}
