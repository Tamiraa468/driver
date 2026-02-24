# Courier Frontend - Feature Demo & Testing Guide

## 🚀 Getting Started

The Courier frontend is fully functional and ready to run. All features have mock data built-in for immediate testing.

## 📱 Tab Navigation (Bottom Tabs)

Click any tab at the bottom to navigate:

- 🏠 **Home** - Dashboard
- 📦 **Orders** - Order management
- 💰 **Earnings** - Earnings tracking
- 👤 **Profile** - Courier profile

---

## 🏠 HOME TAB - Feature Walkthrough

### Status Toggle

1. Click the toggle switch next to "Your Status"
2. Watch the badge change from "Offline" (red) to "Online" (green)
3. Status affects button state below

### Location Card

- Shows mock location: "Sukhbaatar District, Ulaanbaatar"
- "Update Location" button ready for GPS integration
- Click to simulate location update

### Statistics Cards

- **Deliveries Today**: 5 (updates based on order acceptance)
- **Earnings Today**: ₮125,000 (shows daily earnings)
- **Your Rating**: 4.8 ⭐ (driver's current rating)

### Primary Button

- **When Offline**: Gray, disabled - shows message "Go online to start accepting orders"
- **When Online**: Green, enabled - shows "🔍 Find Orders"
- Click to trigger order discovery (ready for API integration)

### Tips Section

- Three helpful tips for new drivers
- Each starts with ✓ checkmark

---

## 📦 ORDERS TAB - Feature Walkthrough

### Tab Navigation (3 sections)

Three buttons at top: Available | Active | Completed

#### 1️⃣ AVAILABLE Orders

**Click "Available" tab to see this view**

Features:

- List of 3 available orders
- Each order card shows:
  - Restaurant name (Pizza Palace, Sushi Express, Burger House)
  - Pickup & dropoff locations
  - Distance in km
  - Delivery fee & total price
  - Order status badge

Actions:

- **Click "Reject"** button → Alert: "Order rejected"
- **Click "Accept"** button → Alert: "Order accepted"
- Cards are pressable (visual feedback when tapped)

#### 2️⃣ ACTIVE Order

**Click "Active" tab to see this view**

Features:

- Single active order: "Asian Kitchen"
- Status Timeline showing 3 steps:
  - ✓ Picked Up (complete, filled dot)
  - ◯ On The Way (in progress, highlighted)
  - ◯ Delivered (pending, empty dot)

Customer Information:

- Name: John Doe
- Phone: +976 9999 9999 (tappable link)
- Special instructions: "Ring doorbell twice, leave at entrance"

Map Placeholder:

- Shows "🗺️ Map Integration Coming Soon"
- Distance: 3.7 km

Action Buttons:

- **First Action**: "📍 On The Way"
  - Changes status timeline
  - Button disappears, next action appears
- **Second Action**: "✓ Mark Delivered"
  - Final action for delivery
  - Shows completion message with checkmark

#### 3️⃣ COMPLETED Orders

**Click "Completed" tab to see this view**

Features:

- Readonly list of past deliveries (2 orders)
- Shows:
  - Restaurant name
  - Pickup/dropoff
  - Distance traveled
  - Delivery fee earned
  - Delivery status (Delivered badge)
- Cards are not clickable (readonly)

---

## 💰 EARNINGS TAB - Feature Walkthrough

### Period Toggle

Three buttons: **Today** | Week | Month

- Click to switch between periods
- Button highlights when active (green background)
- Content updates to reflect selected period

### Summary Card

Green card showing:

- **Total Earnings**: Amount in ₮ (toggles based on period)
  - Today: ₮125,000
  - Week: ₮850,000
  - Month: ₮3,480,000

Three statistics below divider:

- **Deliveries**: Count of completed deliveries
- **Distance**: Total km traveled
- **Avg/Delivery**: Average earning per delivery

### Delivery History

Only shows detailed list when **Today** is selected.
For Week/Month, shows placeholder message.

Each history item shows:

- 📦 Package icon
- Order ID (ORD-001, etc.)
- Distance traveled
- Amount earned (green, positive)
- Time completed

### Earnings Breakdown

Pie chart data shown as percentages:

- Base delivery fee: 70%
- Distance bonus: 20%
- Surge pricing: 10%

---

## 👤 PROFILE TAB - Feature Walkthrough

### Profile Card (Top Section)

Features:

- **Avatar**: Large circle with initials "AJ" (Alexander Johnson)
- **Edit button**: Green pencil icon to edit avatar
- **Name**: Alexander Johnson
- **Phone**: +976 9999 8888
- **Star Rating**: 4.8 ⭐ (visual stars displayed)

Statistics Row:

- **Total Deliveries**: 142
- **Vehicle Type**: 🚴 (Bicycle)

**Edit Profile Button**: Blue button to update profile (ready for edit screen)

### Profile Information Section

Displays:

- Full Name: Alexander Johnson
- Phone Number: +976 9999 8888
- Vehicle Type: Bicycle
- Courier ID: COURIER-001

### Account Settings

Four clickable options:

1. 🔐 Change Password
2. 🔔 Notifications
3. ⚙️ Preferences
4. 💬 Help & Support

Each shows > arrow on right (ready for sub-screens)

### Performance Metrics

Shows three KPIs:

- **Acceptance Rate**: 92% (high = good)
- **On-Time Rate**: 98% (excellent)
- **Cancellation Rate**: 2% (low = good)

### Logout Button

Red "🚪 Logout" button at bottom

- Click to show confirmation dialog
- Alert asks: "Are you sure you want to logout?"
- Two options: Cancel or Logout

---

## 🧪 Testing Scenarios

### Scenario 1: Accept an Order

1. Go to **Orders** tab
2. Click **Available** button
3. Click **Accept** on first order (Pizza Palace)
4. Alert confirms: "Order ORD-2024-001 accepted!"
5. In real app, would move to Active tab

### Scenario 2: Track Active Delivery

1. Go to **Orders** tab
2. Click **Active** button
3. See Asian Kitchen order at "Picked Up" status
4. Click **📍 On The Way** button
5. Status timeline updates - dot moves to "On The Way"
6. New button appears: **✓ Mark Delivered**
7. Click it to complete delivery
8. Success message appears with checkmark

### Scenario 3: Check Earnings

1. Go to **Earnings** tab
2. See **Today** selected with ₮125,000 total
3. Click **Week** button
4. Amount updates to ₮850,000
5. Stat details update (deliveries, distance, average)
6. Delivery history shows placeholder for week data

### Scenario 4: Switch Online Status

1. Go to **Home** tab
2. See toggle at "Offline" with red badge
3. Click toggle switch
4. Badge changes to green "Online"
5. Button below changes from gray to green
6. Button text shows "🔍 Find Orders"
7. Click toggle again to go offline
8. Button grays out

### Scenario 5: View Profile

1. Go to **Profile** tab
2. Scroll to see full profile
3. See: Avatar, Name, Phone, Rating (4.8 ⭐)
4. See stats: 142 deliveries, Bicycle
5. See performance metrics
6. Scroll down to see Account Settings and Logout button
7. Click Logout to see confirmation dialog

---

## 🎨 Design Features to Verify

### Accessibility

- [ ] All buttons are large enough (44pt+ tap target)
- [ ] Colors have sufficient contrast
- [ ] Text is readable in all modes
- [ ] One-handed navigation possible (bottom tabs)

### UX Polish

- [ ] Buttons have visual feedback (pressed state)
- [ ] Cards have subtle shadows
- [ ] Status badges are color-coded
- [ ] Icons enhance understanding
- [ ] Spacing is consistent

### Responsiveness

- [ ] All content fits on small screens
- [ ] Text doesn't overflow
- [ ] Images scale properly
- [ ] Tabs remain accessible

---

## 🔌 Ready for Integration

### Backend Connection Points

All these are ready for real API integration:

**HomeScreen.tsx**

```typescript
// Line ~29: handleToggleOnline()
- Replace alert with: await courierAPI.updateOnlineStatus(value)
```

**OrdersScreen.tsx**

```typescript
// Line ~79: handleAcceptOrder()
- Replace alert with: await orderAPI.acceptOrder(orderId)

// Line ~84: handleRejectOrder()
- Replace alert with: await orderAPI.rejectOrder(orderId)

// Line ~88: handleMarkPickedUp()
- Replace setActiveOrderStatus with: await orderAPI.updateStatus(orderId, 'picked_up')

// Line ~94: handleMarkDelivered()
- Replace setActiveOrderStatus with: await orderAPI.updateStatus(orderId, 'delivered')
```

**ProfileScreen.tsx**

```typescript
// Line ~27: handleLogout()
- Replace alert with: await authAPI.logout(); navigation.reset(...)
```

### Data Structure

All components use TypeScript types from `src/types/order.ts`:

- `CourierOrder` - For all orders
- `CourierProfile` - For profile data
- `CourierEarning` - For earnings

---

## 📊 Mock Data Summary

### Available Orders

- Pizza Palace: 3.2 km, ₮25,000 fee
- Sushi Express: 4.5 km, ₮32,000 fee
- Burger House: 2.1 km, ₮18,000 fee

### Active Order

- Asian Kitchen: 3.7 km, ₮28,000 fee
- Customer: John Doe, +976 9999 9999

### Completed Orders

- Pasta Perfetto: 2.8 km, ₮22,000 fee
- Taco Tuesday: 2.0 km, ₮15,000 fee

### Earnings Data

- Today: 5 deliveries, ₮125,000, 16.3 km
- Week: 32 deliveries, ₮850,000, 118.5 km
- Month: 135 deliveries, ₮3,480,000, 512 km

### Courier Profile

- Name: Alexander Johnson
- Phone: +976 9999 8888
- Vehicle: Bicycle
- Rating: 4.8 ⭐
- Deliveries: 142
- Performance: 92% acceptance, 98% on-time, 2% cancellations

---

## ✅ Testing Checklist

- [ ] All 4 tabs are clickable and navigate
- [ ] Home: Toggle works, button responds to online status
- [ ] Orders: All 3 tabs (Available/Active/Completed) function
- [ ] Orders: Accept/Reject buttons show alerts
- [ ] Orders: Status timeline updates when clicking Mark Picked Up/Delivered
- [ ] Earnings: Period toggle (Today/Week/Month) works
- [ ] Earnings: Numbers update with period
- [ ] Profile: All information displays
- [ ] Profile: Logout button shows confirmation
- [ ] No console errors
- [ ] App runs smoothly without lag
- [ ] All text is readable
- [ ] All buttons are tappable

---

## 🎯 Next Steps

1. **Start the app**: `npx expo start`
2. **Scan QR code** with Expo Go
3. **Navigate through all tabs** to verify functionality
4. **Test interactions** using scenarios above
5. **Check console** for any errors
6. **Prepare for backend integration** using provided hooks

Enjoy your Courier Frontend! 🚚
