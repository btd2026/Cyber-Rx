# Mobile Responsive Dashboard - Quick Start

## Overview

The Vendor Portfolio Dashboard is now fully responsive with mobile-optimized layouts and touch interactions.

## File Locations

### New Components
```
frontend/src/
├── hooks/
│   ├── useResponsive.js              # Breakpoint detection
│   └── useTouchGestures.js           # Touch gesture hooks
├── components/
│   ├── VendorCard.jsx                # Mobile vendor cards
│   ├── MobileHeader.jsx              # Sticky header
│   ├── MobileSidebar.jsx             # Navigation sidebar
│   └── BottomNavigation.jsx          # Bottom nav bar
└── pages/
    └── VendorPortfolioDashboard.responsive.jsx  # Mobile dashboard
```

### Documentation
```
frontend/MOBILE_RESPONSIVE_TESTING.md  # Comprehensive testing guide
T-020-IMPLEMENTATION-SUMMARY.md        # Full implementation details
```

## Quick Integration

### 1. Import the Responsive Dashboard

```javascript
import VendorPortfolioDashboardResponsive from './pages/VendorPortfolioDashboard.responsive';
```

### 2. Use in Your App

```javascript
<VendorPortfolioDashboardResponsive
  api_url={apiUrl}
  authToken={token}
  orgId={orgId}
  onNavigate={handleNavigate}
/>
```

### 3. That's It!

The dashboard will automatically:
- Detect device type (mobile/tablet/desktop)
- Show appropriate layout (cards on mobile, table on desktop)
- Enable touch interactions
- Display mobile navigation (header + bottom nav)

## Using the Hooks

### useResponsive Hook

```javascript
import useResponsive from './hooks/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, screenSize } = useResponsive();

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TableView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

**Returns:**
- `isMobile`: boolean (width < 768px)
- `isTablet`: boolean (width >= 768px && < 1024px)
- `isDesktop`: boolean (width >= 1024px)
- `screenSize`: { width, height }
- `breakpoints`: { mobile: 768, tablet: 1024 }

### useTouchGestures Hook

```javascript
import useTouchGestures from './hooks/useTouchGestures';

function MyComponent() {
  const { touchGesturesRef, isPulling, pullDistance } = useTouchGestures({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    onPullToRefresh: () => refreshData(),
    onLongPress: (e) => showContextMenu(e)
  });

  return (
    <div ref={touchGesturesRef}>
      {/* Content with touch gestures */}
      {isPulling && <PullIndicator distance={pullDistance} />}
    </div>
  );
}
```

**Callbacks:**
- `onSwipeLeft`: Called when swiping left (> 50px)
- `onSwipeRight`: Called when swiping right (> 50px)
- `onSwipeUp`: Called when swiping up (> 50px)
- `onSwipeDown`: Called when swiping down (> 50px)
- `onPullToRefresh`: Called when pulling down > 80px at top
- `onLongPress`: Called after 500ms hold (cancels on movement)

**Returns:**
- `touchGesturesRef`: Ref to attach to element
- `isPulling`: Boolean pull-to-refresh state
- `pullDistance`: Number (0-100) pull distance

## Component Props

### VendorCard

```javascript
<VendorCard
  vendor={vendorObject}          // Required: Vendor data
  onSync={(vendor) => {...}}     // Optional: Sync callback
  onClick={(vendor) => {...}}    // Optional: Click handler
  syncing={boolean}              // Optional: Sync state
/>
```

### MobileHeader

```javascript
<MobileHeader
  title="Dashboard"               // Optional: Header title
  onMenuClick={() => {...}}       // Optional: Menu button callback
  onRefresh={() => {...}}         // Optional: Refresh button callback
  refreshing={boolean}            // Optional: Refresh state
  badge="5 vendors"               // Optional: Badge text
/>
```

### MobileSidebar

```javascript
<MobileSidebar
  isOpen={boolean}                // Required: Open state
  onClose={() => {...}}           // Required: Close callback
  onNavigate={(route) => {...}}   // Optional: Navigation callback
  currentRoute="/dashboard"       // Optional: Current route
/>
```

### BottomNavigation

```javascript
<BottomNavigation
  currentRoute="/dashboard"       // Optional: Current route
  onNavigate={(route) => {...}}   // Optional: Navigation callback
/>
```

## Responsive Widgets

All dashboard widgets now accept a `mobile` prop:

```javascript
<RiskDistributionWidget vendors={vendors} mobile={isMobile} />
<ConnectorHealthWidget vendors={vendors} mobile={isMobile} />
<RecentAlertsWidget alerts={alerts} mobile={isMobile} />
```

## Mobile Features

### 1. Pull-to-Refresh

Pull down on the vendor list to refresh data:

```javascript
const { touchGesturesRef } = useTouchGestures({
  onPullToRefresh: () => refetch()
});

<div ref={touchGesturesRef}>
  {/* Vendor list */}
</div>
```

### 2. Touch Feedback

All touch targets have visual feedback:

```css
/* Applied automatically via CSS */
.touch-feedback:active {
  transform: scale(0.98);
  opacity: 0.8;
}
```

### 3. Bottom Navigation

Fixed bottom navigation for mobile:

- 4 main sections: Vendors, Alerts, Dashboard, Settings
- Active section highlighted in blue
- Icons are grayscale when inactive
- Minimum 44x44px touch targets

### 4. Slide-in Sidebar

Tap menu button to open sidebar:

- Slides in from left
- Overlay backdrop
- Tap outside to close
- Grouped navigation sections

### 5. Vendor Cards

Mobile-optimized card layout:

- Risk score with color bar
- Tier badge with color coding
- Status indicator
- Last sync timestamp
- Sync button with loading state
- Touch feedback animations

## CSS Utilities

### Responsive Grid

```css
/* Auto-responsive grid */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

/* Or use the utility classes */
@media (max-width: 767px) {
  .responsive-grid {
    grid-template-columns: 1fr !important;
  }
}
```

### Touch Targets

```css
/* Minimum touch target sizes */
@media (max-width: 767px) {
  button, a, .clickable {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Safe Areas

```css
/* iOS safe area insets */
@supports (padding: env(safe-area-inset-bottom)) {
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

## Testing

### Manual Testing Checklist

- [ ] Load on iPhone SE (375px)
- [ ] Load on iPad (768px)
- [ ] Test pull-to-refresh
- [ ] Tap menu button and sidebar
- [ ] Navigate using bottom nav
- [ ] Tap vendor cards
- [ ] Test sync button
- [ ] Rotate to landscape
- [ ] Test filter dropdowns

### Testing Guide

See `frontend/MOBILE_RESPONSIVE_TESTING.md` for comprehensive testing instructions.

## Breakpoints

```javascript
// Mobile
< 768px
- Single column layout
- Card view for vendors
- Bottom navigation
- Stacked widgets

// Tablet
768px - 1023px
- Two column layout
- Table view available
- Desktop header
- Simplified widgets

// Desktop
>= 1024px
- Multi-column layout
- Full table view
- Desktop header
- Complete widgets
```

## Performance Tips

1. **Lazy Loading**: Use React.lazy for components
2. **Images**: Use responsive images with srcset
3. **Animations**: Use CSS transforms, not JS
4. **Events**: Use passive event listeners
5. **Charts**: Limit chart complexity on mobile

## Common Issues

### Issue: Bottom nav overlaps content

**Solution**: Add padding to container:

```css
.container {
  padding-bottom: 70px; /* Bottom nav height */
}
```

### Issue: Pull-to-refresh conflicts with browser refresh

**Solution**: Use `e.preventDefault()` in touch handler:

```javascript
const handleTouchMove = (e) => {
  if (isPulling) {
    e.preventDefault();
  }
};
```

### Issue: Sidebar doesn't block scroll

**Solution**: Add body lock when open:

```javascript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, [isOpen]);
```

## Next Steps

1. **Test on Real Devices**: Use the testing guide
2. **Performance Audit**: Run Lighthouse on mobile
3. **User Testing**: Gather feedback from users
4. **Optimize**: Add lazy loading, optimize images
5. **Enhance**: Add PWA support, offline mode

## Support

For issues or questions:
- Check the testing guide: `frontend/MOBILE_RESPONSIVE_TESTING.md`
- See implementation details: `T-020-IMPLEMENTATION-SUMMARY.md`
- Review component code in `frontend/src/components/`

## Example: Complete Mobile Page

```javascript
import React, { useState } from 'react';
import useResponsive from './hooks/useResponsive';
import useTouchGestures from './hooks/useTouchGestures';
import MobileHeader from './components/MobileHeader';
import MobileSidebar from './components/MobileSidebar';
import BottomNavigation from './components/BottomNavigation';

function MyMobilePage() {
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { touchGesturesRef } = useTouchGestures({
    onPullToRefresh: () => setRefreshing(true)
  });

  if (!isMobile) {
    return <DesktopPage />;
  }

  return (
    <>
      <MobileHeader
        title="My Page"
        onMenuClick={() => setSidebarOpen(true)}
        onRefresh={() => setRefreshing(true)}
        refreshing={refreshing}
      />

      <div ref={touchGesturesRef} style={{ paddingBottom: 70 }}>
        {/* Page content */}
      </div>

      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(route) => navigate(route)}
        currentRoute={location.pathname}
      />

      <BottomNavigation
        currentRoute={location.pathname}
        onNavigate={(route) => navigate(route)}
      />
    </>
  );
}
```

---

**Last Updated**: 2026-05-31
**Version**: 1.0.0
**Status**: Production Ready
