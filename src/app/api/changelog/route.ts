import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const content = await readFile(changelogPath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error reading CHANGELOG.md:', error);
    return new NextResponse('# Changelog\n\nErreur lors du chargement du changelog.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
