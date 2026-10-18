import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exportToGeoJson, exportToKML } from '@/lib/geo/geoUtils';

const DATA_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'savedFields.json');

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'geojson';

    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({ error: 'No fields found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const field = data.fields[0];

    if (!field) {
      return NextResponse.json({ error: 'No field record found' }, { status: 404 });
    }

    const sanitizedName = field.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format.toLowerCase() === 'kml') {
      const kmlContent = exportToKML(
        field.name,
        field.boundary,
        field.zones.map((z: { name: string; crop: string; areaAcres: number; polygon: [number, number][] }) => ({
          name: z.name,
          crop: z.crop,
          areaAcres: z.areaAcres,
          polygon: z.polygon,
        }))
      );

      return new NextResponse(kmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.google-earth.kml+xml',
          'Content-Disposition': `attachment; filename="${sanitizedName}_Survey.kml"`,
        },
      });
    }

    // Default: GeoJSON
    const geoJsonData = exportToGeoJson(
      field.name,
      field.totalAreaAcres,
      field.boundary,
      field.zones
    );

    return new NextResponse(JSON.stringify(geoJsonData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': `attachment; filename="${sanitizedName}_Cadastral.geojson"`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Export error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
