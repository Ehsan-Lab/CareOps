# Charity Management System

This project is a comprehensive system for managing donations, beneficiaries, payments, and treasury operations in a structured and efficient manner.

## Project Status

### Completed Milestones
1. **Donor Management Module**
   - Fully implemented CRUD operations for managing donor profiles.

2. **Donation Management Module**
   - Tracks individual donations linked to specific donors and categories.

3. **Feeding Ground Management Module**
   - Manages feeding rounds with allocated amounts and treasury deductions.

4. **Treasury Management Module**
   - Handles categorized funds, ensuring deposits and withdrawals are tracked accurately.

5. **Representatives Management Module**
   - Tracks representatives handling payments, including their contact details.

6. **Payments Management Module**
   - Implemented payment tracking with validations.
   - *Note*: The **Add Payment modal** is implemented but still has some errors.

---

## Future Work

### Immediate Priorities
- [ ] **Fix Add Payment Modal Errors**
   - Ensure proper validations for:
     - Sufficient treasury balance.
     - Linking treasury, payee, and category.
     - Mandatory fields.
   - Address issues related to incorrect balance deductions or modal crashes.
 - [ ] **Automatically calculate the no of packages in a feeding round**
 - [ ] **Add support for recurring payments and its statuses(Paid, Unpaid)**
 - [ ] **Add support for recurring donations and its statuses(Paid, Unpaid)**

### Planned Enhancements
1. **Payee Management Enhancements**
   - Improve autocomplete dropdown for payee selection.
   - Add support for bulk payee imports.

2. **Dashboard Overview**
   - Create a dashboard summarizing:
     - Total donations.
     - Payments made by category.
     - Treasury balances.
     - Feeding round statuses.

3. **Advanced Reporting**
   - Add export options for generating detailed reports on:
     - Donations by donor.
     - Payments by category and representative.
     - Treasury fund usage.

4. **Notification System**
   - Notify users about:
     - Low treasury balances.
     - Upcoming recurring payments.
     - Feeding round schedules.

5. **User Roles and Permissions**
   - Add role-based access controls for:
     - Administrators.
     - Data entry staff.
     - View-only users.

6. **Recurring Payments Automation**
   - Automate recurring payments for seasonal or regular support.

### Long-Term Goals
1. **Multi-Tenancy Support**
   - Allow multiple organizations to use the system with isolated data.

2. **Integration with External Platforms**
   - Integrate with financial platforms for payment tracking.
   - Add support for donor communication tools (e.g., emails, SMS).

3. **Mobile Application**
   - Develop a mobile-friendly interface for quick data entry and monitoring.

4. **AI-Powered Insights**
   - Use AI to:
     - Predict funding shortages.
     - Suggest optimal fund allocation.
     - Identify high-value donors.
