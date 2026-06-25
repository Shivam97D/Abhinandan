export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: "Fried" | "Rolls" | "Sandwiches" | "Drinks" | "Sweets" | "Specials";
  veg: boolean;
  color: string;
  desc: string;
  available?: boolean;
  popular?: boolean;
};

export const menuItems: MenuItem[] = [
  { id: "samosa", name: "Samosa", price: 18, category: "Fried", veg: true, color: "#E8A93C", desc: "Crispy potato-stuffed pastry", available: true, popular: true },
  { id: "vadapav", name: "Vada Pav", price: 20, category: "Fried", veg: true, color: "#D9742A", desc: "Mumbai's favourite burger", available: true, popular: true },
  { id: "misal", name: "Misal Pav", price: 55, category: "Specials", veg: true, color: "#C0392B", desc: "Spicy sprout curry with pav", available: true },
  { id: "pohe", name: "Kande Pohe", price: 35, category: "Specials", veg: true, color: "#F1C947", desc: "Flattened rice with onions", available: true },
  { id: "batatawada", name: "Batata Wada", price: 15, category: "Fried", veg: true, color: "#E8A93C", desc: "Spiced potato fritter", available: true },
  { id: "cheesesand", name: "Cheese Sandwich", price: 50, category: "Sandwiches", veg: true, color: "#F5E6B8", desc: "Grilled with melted cheese", available: true },
  { id: "paneerroll", name: "Paneer Roll", price: 65, category: "Rolls", veg: true, color: "#D9742A", desc: "Spiced paneer wrap", available: true },
  { id: "upma", name: "Upma", price: 30, category: "Specials", veg: true, color: "#EFE3C2", desc: "Savoury semolina", available: true },
  { id: "sheera", name: "Sheera", price: 25, category: "Sweets", veg: true, color: "#E5B26B", desc: "Sweet semolina pudding", available: true },
  { id: "coldcoffee", name: "Cold Coffee", price: 65, category: "Drinks", veg: true, color: "#6B4226", desc: "Chilled coffee blend", available: true, popular: true },
  { id: "mangoshake", name: "Mango Shake", price: 70, category: "Drinks", veg: true, color: "#F4B83A", desc: "Fresh Alphonso shake", available: true },
  { id: "masalachai", name: "Masala Chai", price: 20, category: "Drinks", veg: true, color: "#8B5A2B", desc: "Spiced milk tea", available: true, popular: true },
];

export const quickAddItems = [
  { id: "samosa", name: "Samosa", price: 18 },
  { id: "vadapav", name: "Vada Pav", price: 20 },
  { id: "masalachai", name: "Cutting", price: 15 },
  { id: "coldcoffee", name: "Cold ☕", price: 65 },
  { id: "misal", name: "Misal", price: 55 },
  { id: "sheera", name: "Sheera", price: 25 },
];

export const teaItems = [
  { id: "masala", name: "Masala Chai", price: 20 },
  { id: "cutting", name: "Cutting Chai", price: 15 },
  { id: "ginger", name: "Ginger Tea", price: 20 },
  { id: "black", name: "Black Tea", price: 15 },
  { id: "coldcoffee", name: "Cold Coffee", price: 65 },
  { id: "lemon", name: "Lemon Tea", price: 20 },
  { id: "kadak", name: "Kadak Special Tea", price: 25 },
  { id: "filter", name: "Filter Coffee", price: 30 },
];

export const revenueWeek = [
  { day: "Mon", tea: 1200, snacks: 1800 },
  { day: "Tue", tea: 1500, snacks: 2100 },
  { day: "Wed", tea: 1100, snacks: 1700 },
  { day: "Thu", tea: 1800, snacks: 2900 },
  { day: "Fri", tea: 1650, snacks: 2500 },
  { day: "Sat", tea: 2100, snacks: 3200 },
  { day: "Sun", tea: 1640, snacks: 2640 },
];

export const hourlyOrders = [
  { hour: "7AM", orders: 6 },
  { hour: "8AM", orders: 12 },
  { hour: "9AM", orders: 9 },
  { hour: "10AM", orders: 5 },
  { hour: "11AM", orders: 4 },
  { hour: "12PM", orders: 8 },
  { hour: "1PM", orders: 7 },
  { hour: "2PM", orders: 5 },
  { hour: "3PM", orders: 4 },
  { hour: "4PM", orders: 6 },
  { hour: "5PM", orders: 14 },
  { hour: "6PM", orders: 28 },
  { hour: "7PM", orders: 22 },
  { hour: "8PM", orders: 18 },
  { hour: "9PM", orders: 11 },
  { hour: "10PM", orders: 5 },
];

export const topItems = [
  { name: "Samosa", revenue: 774, count: 43 },
  { name: "Cutting Chai", revenue: 560, count: 28 },
  { name: "Vada Pav", revenue: 500, count: 25 },
  { name: "Cold Coffee", revenue: 455, count: 7 },
  { name: "Misal Pav", revenue: 385, count: 7 },
];

export const recentOrders = [
  { token: "#047", section: "Snacks", items: "Samosa x2, Chai", amount: 56, payment: "UPI", status: "Pending", time: "6:42 PM" },
  { token: "#046", section: "Snacks", items: "Misal Pav", amount: 55, payment: "Cash", status: "Ready", time: "6:39 PM" },
  { token: "#045", section: "Tea", items: "Kadak Chai x4", amount: 100, payment: "Cash", status: "Served", time: "6:35 PM" },
  { token: "#044", section: "Snacks", items: "Vada Pav x3, Cold Coffee", amount: 125, payment: "UPI", status: "Ready", time: "6:33 PM" },
  { token: "#043", section: "Snacks", items: "Cheese Sandwich, Mango Shake", amount: 120, payment: "UPI", status: "Pending", time: "6:30 PM" },
  { token: "#042", section: "Tea", items: "Filter Coffee x2", amount: 60, payment: "Cash", status: "Served", time: "6:25 PM" },
  { token: "#041", section: "Snacks", items: "Paneer Roll, Chai", amount: 85, payment: "UPI", status: "Served", time: "6:20 PM" },
  { token: "#040", section: "Snacks", items: "Pohe x2", amount: 70, payment: "Cash", status: "Cancelled", time: "6:15 PM" },
];

export const tokenQueue = [
  { token: "#043", status: "Served" as const },
  { token: "#044", status: "Ready" as const },
  { token: "#045", status: "Served" as const },
  { token: "#046", status: "Ready" as const },
  { token: "#047", status: "Pending" as const },
];
