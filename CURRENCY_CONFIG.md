# Currency Configuration

This project uses the Naira (NGN) as the default currency. The currency formatting is centralized in `/src/services/currency.js`.

## Current Configuration

**Default Currency:** Nigerian Naira (₦ / NGN)  
**Locale:** en-NG (English - Nigeria)

## How It Works

The `formatCurrency()` function automatically formats numbers into the configured currency format:

```javascript
import { formatCurrency } from '../../services/currency';

// Examples:
formatCurrency(1500)        // ₦1,500.00
formatCurrency(2500.50)     // ₦2,500.50
formatCurrency(-1000)       // -₦1,000.00
```

## Changing the Currency

### Option 1: Environment Variables (Recommended for future)

In your `.env` file, you can set:

```env
VITE_CURRENCY=NGN
VITE_LOCALE=en-NG
```

Supported currencies include:
- `NGN` - Nigerian Naira (₦)
- `USD` - US Dollar ($)
- `EUR` - Euro (€)
- `GBP` - British Pound (£)
- Any valid ISO 4217 currency code

### Option 2: Direct Configuration

Edit `/src/services/currency.js`:

```javascript
const DEFAULT_CURRENCY = 'NGN';  // Change this
const DEFAULT_LOCALE = 'en-NG';  // Change this
```

## Components Using Currency

The following components use the `formatCurrency` function:

- ✅ **Reconcile** - `/src/components/modules/Reconcile.jsx`
- 🔜 **Finance** - Needs update
- 🔜 **AccountsPayable** - Needs update
- 🔜 **Purchase Orders** - Needs update
- 🔜 **Material Requests** - Needs update

## Future Enhancement: Settings Page

A settings page will be added to allow users to change the currency dynamically without editing code:

1. **Admin Settings → Currency**
2. Select currency from dropdown
3. Changes apply across the entire application
4. Stored in user preferences or organization settings

## Implementation Status

✅ Currency service created  
✅ Reconcile component updated to use Naira  
🔜 Update remaining financial components  
🔜 Add currency settings page  
🔜 Store currency preference in database  

## Testing

To test different currencies during development, modify the `.env` file:

```env
# Test with USD
VITE_CURRENCY=USD
VITE_LOCALE=en-US

# Test with Euro
VITE_CURRENCY=EUR
VITE_LOCALE=en-DE

# Back to Naira (default)
VITE_CURRENCY=NGN
VITE_LOCALE=en-NG
```

Then restart the dev server.
