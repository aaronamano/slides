import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    const kibanaUrl = process.env.KIBANA_URL;
    const apiKey = process.env.ELASTICSEARCH_API_KEY;
    
    if (!kibanaUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Elasticsearch environment variables not configured' },
        { status: 500 }
      );
    }
    
    const agentUrl = `${kibanaUrl}/api/agent_builder/converse`;
    
    const payload = {
      "input": input,
      "agent_id": "slides-agent"
    };
    
    const headers = {
      "Authorization": `ApiKey ${apiKey}`,
      "Content-Type": "application/json",
      "kbn-xsrf": "true"
    };
    
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Agent API error:', errorData);
      return NextResponse.json(
        { error: errorData.message || errorData.error || `HTTP error! status: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}