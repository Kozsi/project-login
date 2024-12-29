// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { WelcomeComponent } from './welcome/welcome.component';
import { CalendarComponent } from './calendar/calendar.component';
import { ProfileComponent } from './profile/profile.component';
import { LoginComponent } from './login/login.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngForm, etc.
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    CalendarComponent,
    ProfileComponent,
    LoginComponent,
    SidebarComponent // Make sure this is declared here
  ],
  imports: [
    BrowserModule,
    AppRoutingModule, // Import routing module
    FormsModule,
    RouterModule // For forms support
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
