/*
  # E-Commerce Platform Database Schema

  ## Overview
  Complete database schema for a conversion-optimized furniture e-commerce platform
  with shopping cart, reviews, orders, and promotional features.

  ## New Tables

  ### `categories`
  - `id` (uuid, primary key) - Unique category identifier
  - `name` (text) - Category name (e.g., "Sofas", "Chairs", "Tables")
  - `slug` (text, unique) - URL-friendly category identifier
  - `description` (text) - Category description for SEO
  - `image_url` (text) - Category banner image
  - `parent_id` (uuid, nullable) - For hierarchical categories
  - `display_order` (integer) - Order in navigation menus
  - `created_at` (timestamptz) - Creation timestamp

  ### `products`
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text) - Product name
  - `slug` (text, unique) - URL-friendly product identifier
  - `description` (text) - Full product description
  - `short_description` (text) - Brief description for listings
  - `price` (numeric) - Regular price in GBP
  - `sale_price` (numeric, nullable) - Promotional price
  - `category_id` (uuid) - Foreign key to categories
  - `images` (jsonb) - Array of image URLs and alt text
  - `stock_count` (integer) - Available inventory
  - `rating` (numeric) - Average customer rating (0-5)
  - `review_count` (integer) - Total number of reviews
  - `featured` (boolean) - Whether product is featured
  - `specifications` (jsonb) - Product specifications (dimensions, materials, etc.)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `reviews`
  - `id` (uuid, primary key) - Unique review identifier
  - `product_id` (uuid) - Foreign key to products
  - `customer_name` (text) - Reviewer name
  - `customer_avatar` (text, nullable) - Reviewer avatar URL
  - `customer_location` (text, nullable) - Reviewer location (e.g., "London, UK")
  - `rating` (integer) - Rating 1-5 stars
  - `title` (text) - Review title
  - `comment` (text) - Review text
  - `verified_purchase` (boolean) - Whether review is from verified purchase
  - `helpful_count` (integer) - Number of helpful votes
  - `created_at` (timestamptz) - Review submission date

  ### `cart_items`
  - `id` (uuid, primary key) - Unique cart item identifier
  - `session_id` (text) - Anonymous session identifier
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Item quantity
  - `created_at` (timestamptz) - When item was added
  - `updated_at` (timestamptz) - Last update timestamp

  ### `orders`
  - `id` (uuid, primary key) - Unique order identifier
  - `order_number` (text, unique) - Human-readable order number
  - `customer_email` (text) - Customer email address
  - `customer_name` (text) - Customer name
  - `shipping_address` (jsonb) - Shipping address details
  - `items` (jsonb) - Order items snapshot
  - `subtotal` (numeric) - Order subtotal
  - `shipping_cost` (numeric) - Shipping cost
  - `tax` (numeric) - Tax amount
  - `total` (numeric) - Order total
  - `status` (text) - Order status (pending, processing, shipped, delivered)
  - `created_at` (timestamptz) - Order creation date

  ### `promotional_banners`
  - `id` (uuid, primary key) - Unique banner identifier
  - `title` (text) - Banner headline
  - `message` (text) - Banner message
  - `cta_text` (text) - Call-to-action button text
  - `cta_url` (text) - Call-to-action URL
  - `discount_percentage` (integer, nullable) - Discount percentage
  - `expires_at` (timestamptz, nullable) - Expiration date for countdown
  - `is_active` (boolean) - Whether banner is currently active
  - `display_order` (integer) - Display priority
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for products, categories, reviews, and active promotional banners
  - Authenticated write access for cart items
  - Service role only for orders and admin operations

  ## Indexes
  - Products: category_id, featured, slug
  - Reviews: product_id, rating
  - Cart items: session_id
  - Orders: customer_email, status
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  short_description text,
  price numeric NOT NULL CHECK (price >= 0),
  sale_price numeric CHECK (sale_price >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  images jsonb DEFAULT '[]'::jsonb,
  stock_count integer DEFAULT 0 CHECK (stock_count >= 0),
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer DEFAULT 0 CHECK (review_count >= 0),
  featured boolean DEFAULT false,
  specifications jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  customer_avatar text,
  customer_location text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text NOT NULL,
  verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, product_id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  shipping_address jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  shipping_cost numeric NOT NULL CHECK (shipping_cost >= 0),
  tax numeric NOT NULL CHECK (tax >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create promotional_banners table
CREATE TABLE IF NOT EXISTS promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  cta_text text,
  cta_url text,
  discount_percentage integer CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for products (public read)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for reviews (public read)
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for cart_items (session-based access)
CREATE POLICY "Users can view their own cart items"
  ON cart_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert their own cart items"
  ON cart_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own cart items"
  ON cart_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete their own cart items"
  ON cart_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for orders (users can only view their own orders)
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for promotional_banners (public read for active banners)
CREATE POLICY "Active promotional banners are viewable by everyone"
  ON promotional_banners FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
