# Courier (Driver) Frontend - Delivery App

Complete React Native (Expo) + TypeScript implementation of the Courier/Driver side of a crowdsourced last-mile delivery application.

## Features Implemented

### 1. **Home Tab (Courier Dashboard)**

- Online/Offline toggle switch with real-time status display
- Current location display (mock GPS data)
- Summary statistics cards:
  - Deliveries completed today
  - Earnings today
  - Current rating
- Primary CTA button: "🔍 Find Orders" (enabled only when online)
- Tips for success section

### 2. **Orders Tab**

Three sections with tab-based navigation:

#### Available Orders

- List of available delivery orders
- Order cards showing:
  - Restaurant/Supplier name
  - Pickup location
  - Drop-off location
  - Distance in km
  - Delivery fee
  - Accept/Reject buttons
- Driver can accept or reject orders

#### Active Order

- Current active delivery status with visual timeline
- Order status progression: Picked Up → On The Way → Delivered
- Customer information (name, phone, special instructions)
- Map placeholder (ready for Google Maps integration)
- Action buttons:
  - "Mark as Picked Up"
  - "Mark as Delivered"
- Order details and distance display

#### Completed Orders

- History of completed deliveries
- Readonly view showing past delivery details
- Historical data for driver reference

### 3. **Earnings Tab**

- Period toggle: Today / Week / Month
- Summary metrics:
  - Total earnings
  - Delivery count
  - Total distance traveled
  - Average earning per delivery
- Delivery history list with:
  - Order ID
  - Delivery distance
  - Earning amount
  - Time completed
- Earnings breakdown percentages:
  - Base delivery fee (70%)
  - Distance bonus (20%)
  - Surge pricing (10%)

### 4. **Profile Tab**

- Driver profile card with:
  - Avatar with initials
  - Full name
  - Phone number
  - Star rating (visual stars)
  - Total deliveries count
  - Vehicle type (emoji + label)
- Edit profile button
- Profile information section
- Account settings:
  - Change password
  - Notifications
  - Preferences
  - Help & support
- Performance metrics:
  - Acceptance rate
  - On-time delivery rate
  - Cancellation rate
- Logout button with confirmation dialog
- App version display

## Project Structure

```
src/
├── components/
│   ├── OrderCard.tsx          # Reusable order card component
│   ├── StatusToggle.tsx       # Online/Offline toggle switch
│   └── ...
├── screens/
│   ├── courier/
│   │   ├── HomeScreen.tsx
│   │   ├── OrdersScreen.tsx
│   │   ├── EarningsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── index.ts
│   └── ...
├── navigation/
│   ├── CourierTabs.tsx        # Bottom tab navigation
│   └── ...
├── types/
│   ├── order.ts               # Courier-specific types
│   └── ...
└── ...
```

## Type Definitions

### CourierOrder

```typescript
interface CourierOrder {
  id: string;
  restaurantName: string;
  pickupLocation: string;
  dropoffLocation: string;
  distance: number; // km
  deliveryFee: number;
  totalPrice: number;
  status: CourierOrderStatus;
  customerPhone?: string;
  customerName?: string;
  instructions?: string;
  createdAt: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
}
```

### CourierProfile

```typescript
interface CourierProfile {
  id: string;
  name: string;
  phone: string;
  vehicleType: "bike" | "scooter" | "car";
  rating: number;
  totalDeliveries: number;
  avatar?: string;
  isOnline: boolean;
  currentLocation?: { latitude: number; longitude: number };
}
```

### CourierEarning

```typescript
interface CourierEarning {
  id: string;
  orderId: string;
  amount: number;
  deliveryDistance: number;
  completedAt: string;
}
```

## Navigation Structure

```
CourierTabs (Bottom Tab Navigator)
├── Home Tab
├── Orders Tab
│   ├── Available (FlatList)
│   ├── Active (Single Order)
│   └── Completed (FlatList)
├── Earnings Tab
│   └── Period Toggle (Today/Week/Month)
└── Profile Tab
    └── Account Options
```

## Design Guidelines Implemented

✅ Clean, minimal, driver-friendly UI  
✅ Large, easy-to-tap buttons (44x44pt minimum)  
✅ High contrast colors (#1a1a1a text on white/light backgrounds)  
✅ One-hand usable (bottom tab navigation)  
✅ No unnecessary animations (smooth transitions only)  
✅ Clear visual hierarchy with font sizes and weights  
✅ Accessible color usage (green for success, red for danger, blue for info)

## Color Scheme

- **Primary**: #28a745 (Success Green)
- **Primary Alt**: #0066cc (Blue)
- **Success**: #10b981 (Green)
- **Warning**: #ffc107 (Yellow)
- **Danger**: #dc3545 (Red)
- **Background**: #fff (White)
- **Surface**: #f8f9fa (Light Gray)
- **Text**: #1a1a1a (Dark Gray)
- **Subtitle**: #666 (Medium Gray)

## Mock Data Included

All screens include realistic mock data:

- 3 available orders with various locations/fees
- 1 active order with customer info
- 2 completed orders for history
- Earnings data for today/week/month
- Complete courier profile information

## Components

### OrderCard

Reusable component for displaying orders with:

- Accept/Reject actions for available orders
- Pressable state for navigation
- Status badges
- Distance and price information
- Compact and full view modes

### StatusToggle

Toggle switch component for Online/Offline status:

- Visual status badge
- Switch animation
- Color-coded states

## Integration Notes

### Ready for Backend Integration

- All API calls are structured as console logs for now
- Replace with actual API calls in:
  - `handleAcceptOrder()` in OrdersScreen
  - `handleToggleOnline()` in HomeScreen
  - `handleLogout()` in ProfileScreen

### Ready for Navigation Integration

- Update `RootNavigator.tsx` to show CourierTabs after login
- Connect authentication context to profile screen
- Implement real location tracking in HomeScreen

### Ready for Map Integration

- Map placeholder in ActiveOrderScreen ready for Google Maps React Native
- Distance and coordinates available in CourierOrder type

## Running the App

```bash
# Install dependencies
npm install
# or
yarn install

# Start Expo development server
npx expo start

# Run on Android/iOS
# Scan QR code with Expo Go app or press i/a in terminal
```

## Performance Optimizations

- FlatList for order history (scrollable lists)
- Memoized components where needed
- Efficient state management
- No unnecessary re-renders with proper key usage

## Accessibility

- Clear tap targets (44pt minimum)
- High color contrast
- Readable font sizes (12pt minimum)
- Semantic HTML-like structure
- Meaningful button labels

## Future Enhancements

- Real GPS location tracking
- Google Maps integration
- Push notifications for new orders
- Real-time order tracking with WebSocket
- Payment integration
- Rating/review system
- In-app chat with customers
- Order filters and sorting
- Advanced analytics dashboard
- Photo capture for deliveries
