class CouponFinder {
    constructor() {
        this.availableCoupons = new Map();
    }

    async findCoupons(productUrl) {
        try {
            // Simulate API call to coupon service
            const coupons = await this.fetchCouponsFromAPI(productUrl);
            this.availableCoupons.set(productUrl, coupons);
            return coupons;
        } catch (error) {
            console.error('Error finding coupons:', error);
            return [];
        }
    }

    async fetchCouponsFromAPI(productUrl) {
        // Simulated API response
        return [
            {
                code: 'SAVE20',
                discount: '20%',
                expiry: '2024-12-31',
                description: '20% off selected items'
            },
            {
                code: 'FREESHIP',
                discount: 'Free Shipping',
                expiry: '2024-06-30',
                description: 'Free shipping on orders over $25'
            }
        ];
    }

    async applyCoupon(productUrl, couponCode) {
        const coupons = this.availableCoupons.get(productUrl) || [];
        const coupon = coupons.find(c => c.code === couponCode);
        
        if (coupon) {
            return this.modifyUrlWithCoupon(productUrl, couponCode);
        }
        return productUrl;
    }

    modifyUrlWithCoupon(url, couponCode) {
        const urlObj = new URL(url);
        urlObj.searchParams.set('coupon', couponCode);
        return urlObj.toString();
    }

    getAvailableCoupons(productUrl) {
        return this.availableCoupons.get(productUrl) || [];
    }
}

const couponFinder = new CouponFinder();