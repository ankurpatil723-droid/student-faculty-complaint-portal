import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getSubcategories } from '@/lib/complaint-store';
import type { CategoryType } from '@/lib/types';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const categoryParam = url.searchParams.get('category');

  if (categoryParam) {
    const subcategories = getSubcategories(categoryParam as CategoryType);
    return NextResponse.json({ category: categoryParam, subcategories });
  }

  const categories = getCategories();
  return NextResponse.json({ categories });
}
