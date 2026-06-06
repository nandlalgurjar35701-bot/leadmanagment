Email: admin@crm.com
Password: admin123

Agar tum **Website Sales Lead Management CRM** bana rahe ho jisme cold calling se leads add hongi aur website-selling process track karni hai, to Antigravity/Codex ko dene ke liye ye detailed prompt use kar sakte ho.

# Project: Website Sales Lead Management CRM

## Goal

Ek CRM banana hai jisme sales team cold calling karke leads add kare, follow-up manage kare, status update kare aur track kare ki kaunsa customer website kharidne ke liye ready hai.

---

# Phase 1: Project Setup

Create a full-stack application using:

* Backend: Node.js + Express.js
* Database: MongoDB
* Frontend: EJS
* Authentication: JWT + Session
* UI: Bootstrap 5
* Architecture: MVC Pattern

---

# Phase 2: User Roles

### Admin

Can:

* Create users
* View all leads
* Assign leads
* Change lead owner
* View reports
* Manage website categories
* Export data

### Sales User

Can:

* Add lead
* Edit own leads
* Update status
* Add follow-up notes
* Schedule next follow-up
* View own dashboard

---

# Phase 3: Lead Module

Create Lead Collection

```js
{
  name: String,

  email: String,

  mobileNumbers: [
    {
      number: String
    }
  ],

  address: String,

  city: String,

  country: String,

  storeName: String,

  categories: [
    {
      type: String
    }
  ],

  budget: Number,

  leadSource: {
    type: String,
    enum: [
      "Cold Calling",
      "Facebook",
      "Instagram",
      "WhatsApp",
      "Reference",
      "Website"
    ]
  },

  assignedTo: ObjectId,

  createdBy: ObjectId,

  status: String,

  priority: String,

  nextFollowupDate: Date,

  expectedClosingDate: Date,

  notes: String,

  createdAt: Date,

  updatedAt: Date
}
```

---

# Phase 4: Website Categories

Admin can manage categories.

Examples:

```json
[
  "Salon",
  "Clinic",
  "Hospital",
  "Restaurant",
  "Hotel",
  "School",
  "Gym",
  "Real Estate",
  "Ecommerce",
  "Travel Agency",
  "NGO",
  "Construction",
  "Lawyer",
  "CA",
  "Personal Portfolio"
]
```

Lead can have multiple categories.

Example:

```json
[
  "Salon",
  "Ecommerce"
]
```

---

# Phase 5: Lead Status Pipeline

Create Kanban-style workflow.

```text
New Lead

Contacted

Interested

Demo Scheduled

Proposal Sent

Negotiation

Ready To Buy

Won

Lost

Not Interested

Follow-up Required
```

Lead should move between statuses.

---

# Phase 6: Follow-up Management

Each lead can have unlimited follow-ups.

```js
{
  leadId: ObjectId,

  followupDate: Date,

  discussion: String,

  nextAction: String,

  nextFollowupDate: Date,

  createdBy: ObjectId
}
```

---

# Phase 7: Dashboard

Show cards:

```text
Total Leads

Today's Follow-ups

Interested Leads

Ready To Buy

Won Leads

Lost Leads

This Month Revenue
```

Charts:

```text
Lead Status Distribution

Monthly Lead Growth

Conversion Rate

Sales User Performance
```

---

# Phase 8: Lead Details Page

Show:

```text
Customer Name

All Mobile Numbers

Email

Address

Store Name

Website Categories

Budget

Lead Status

Lead Owner

Created Date

Follow-up Timeline

Notes
```

---

# Phase 9: Lead Timeline

Track every action.

Example:

```text
Lead Created

Status Changed

Lead Assigned

Note Added

Follow-up Added

Proposal Sent

Deal Won
```

Store all logs.

---

# Phase 10: Reminder System

Daily reminder.

Notify when:

```text
Follow-up due today

Overdue follow-up

Deal expected closing today
```

---

# Phase 11: Search & Filters

Filter by:

```text
Status

Category

City

Country

Budget

Assigned User

Date Range
```

Search:

```text
Name

Mobile Number

Email

Store Name
```

---

# Phase 12: Reports

Generate reports:

```text
Daily Leads

Weekly Leads

Monthly Leads

Conversion Rate

Won/Lost Report

Sales Performance
```

Export:

```text
Excel

CSV
```

---

# Phase 13: Lead Scoring

Automatically calculate score.

```text
Budget > 50k = +20

Budget > 1 lakh = +40

Interested = +20

Demo Scheduled = +20

Proposal Sent = +30

Ready To Buy = +50
```

Display:

```text
Hot Lead 🔥

Warm Lead 🟡

Cold Lead ❄️
```

---

# Phase 14: Future Features

```text
WhatsApp Integration

Auto Calling Logs

Email Integration

Proposal Generator

Invoice Generator

Payment Tracking

Multi Tenant CRM

AI Follow-up Suggestions
```

---

# Final Objective

Build a professional CRM specifically for selling websites through cold calling, where sales agents can manage leads, follow-ups, budgets, categories, customer interest level, and conversion tracking from first call to final sale. This system should be scalable for thousands of leads and multiple sales users.
