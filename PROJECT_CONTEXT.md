# PERFECTO CLEANING SERVICES
## AI Development Context

# Project Overview

Perfecto Cleaning Services is a premium cleaning company that provides residential and commercial cleaning services.

The goal of this project is not simply to build a marketing website. The objective is to build a scalable business platform that manages the complete customer journey—from discovering the company, requesting a quote, booking a service, paying deposits, managing appointments, and eventually expanding into customer loyalty, memberships, AI automation, and commercial management.

The platform is intentionally designed in multiple versions to allow the business to launch quickly while building toward a larger long-term vision.

This document gives the implementation context for the AI coding agent.

---

# Business Goals

The platform should help Perfecto:

• Build trust with new customers.
• Generate online bookings.
• Collect deposits before appointments.
• Reduce manual scheduling.
• Manage customers efficiently.
• Handle job applications online.
• Scale into a complete business management platform.

Every technical decision should support one or more of these goals.

---

# Long-Term Product Vision

The complete product will eventually include:

- Marketing Website
- Online Booking Platform
- Customer Portal
- Admin Dashboard
- Recruitment Portal
- Loyalty System
- Referral System
- Membership Plans
- AI Chatbot
- Cleaner Portal
- Commercial Client Portal
- Online Store
- WhatsApp Integration
- Multi-language Support

However...

**DO NOT IMPLEMENT ALL OF THESE NOW.**

Development follows phased releases.

Only implement the current version.

---

# Current Development Phase

Current Version:

# VERSION 1.0

Everything implemented must belong ONLY to Version 1.0.

If a feature belongs to Version 1.5, Version 2.0, or Version 3.0, it must NOT be implemented.

However, architecture should remain scalable so future versions can be added without major refactoring.

---

# Version Roadmap

## Version 1.0
Business Launch Platform

Goal:
Launch a complete platform capable of operating the business online.

Includes:

• Marketing Website
• Customer Authentication
• Instant Quote
• Booking System
• Deposit Payments
• Customer Dashboard
• Admin Dashboard
• Recruitment System
• Email Notifications
• Legal Agreements

---

## Version 1.5

Customer experience improvements.

Includes:

- Reviews
- Calendar Management
- Promotions
- Gallery Management
- Service Management
- Appointment Reminders
- Review Requests

---

## Version 2.0

Customer retention.

Includes:

- Loyalty
- Memberships
- Referrals
- Coupons
- Gift Cards

---

## Version 3.0

Business expansion.

Includes:

- AI Chatbot
- Cleaner Portal
- Commercial Portal
- Shop
- WhatsApp
- Multi-language

---

# IMPORTANT

The AI should ignore Version 1.5, Version 2.0, and Version 3.0 during implementation.

Only use them to make architectural decisions that support future expansion.

Do not generate UI, APIs, database tables, or business logic for future versions unless explicitly requested.

---

# Version 1.0 Functional Scope

The following modules MUST be implemented.

## Public Website

- Home
- About
- Services
- Individual Service Pages
- Gallery
- Testimonials
- FAQ
- Promotions
- Contact
- Careers

---

## Authentication

Phone-first authentication.

Flow:

Phone Number
↓

OTP Verification
↓

Email

↓

Email Verification

↓

Account Created

Phone is the primary identifier.

---

## Quote Calculator

Users can estimate pricing using:

- Service
- Bedrooms
- Bathrooms
- Property Size
- Pets
- Frequency
- Add-ons

---

## Booking

Users can:

- Select service
- Choose schedule
- Upload photos
- Add notes
- Accept agreements
- Pay deposit

---

## Payments

Bookings require payment in full at booking time.

A booking is only confirmed after payment succeeds.

---

## Customer Dashboard

Users can:

- View bookings
- View invoices
- View payment history
- Update profile

---

## Admin Dashboard

Admins can:

- Manage bookings
- Manage customers
- Manage payments
- Manage services
- View uploaded property photos

---

## Recruitment

Applicants can:

- Apply online
- Upload resume

Admins can:

- Review applications
- Update status
- Send hiring/rejection emails

---

## Notifications

Email:

- Verification
- Booking Confirmation
- Payment Confirmation
- Hiring Status

SMS:

- OTP

---

# Technology Stack

Frontend

- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui

Backend

- Next.js Route Handlers
- Server Actions

Database

- PostgreSQL

ORM

- Prisma

Authentication

- Firebase Authentication

Storage

- AWS S3

Email

- Firebase Email Verification
- Transactional Email Service

Validation

- Zod

Forms

- React Hook Form

State

- TanStack Query
- Zustand

---

# Development Principles

Every feature should be:

- Modular
- Reusable
- Type-safe
- Mobile-first
- Accessible
- Production-ready
- Scalable

Avoid duplication.

Prefer feature-based architecture.

Follow clean architecture principles.

---

# Design Philosophy

The UI should feel like a premium lifestyle brand rather than a traditional cleaning company.

Keywords:

Elegant

Minimal

Premium

Trustworthy

Modern

Friendly

Luxury

Clean

Lots of whitespace

Soft shadows

Rounded corners

Blue + Green + White

The design should increase trust and conversions.

---

# Success Criteria

Version 1.0 is complete when a customer can:

Visit the website

↓

Get a quote

↓

Create an account

↓

Verify phone

↓

Verify email

↓

Book a service

↓

Pay deposit

↓

Receive confirmation

↓

Manage bookings

and when an administrator can:

Receive bookings

↓

Manage customers

↓

Track payments

↓

Review applications

↓

Run the business entirely online.