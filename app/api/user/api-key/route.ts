import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db/connection';
import { User } from '@/lib/db/models';
import type { ApiResponse } from '@/types';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('+anthropicApiKey aiProvider');

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ hasKey: boolean; keyPreview?: string; aiProvider?: string }>>({
      success: true,
      data: {
        hasKey: !!user.anthropicApiKey,
        keyPreview: user.anthropicApiKey
          ? `${user.anthropicApiKey.substring(0, 4)}...${user.anthropicApiKey.slice(-4)}`
          : undefined,
        aiProvider: user.aiProvider || 'claude',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/user/api-key:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch API key status',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { apiKey, aiProvider } = await request.json();

    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'API key is required',
        },
        { status: 400 }
      );
    }

    if (aiProvider === 'claude' && !apiKey.startsWith('sk-')) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid Claude API key format. Must start with sk-',
        },
        { status: 400 }
      );
    }

    if (aiProvider === 'gemini' && !apiKey.startsWith('AIza')) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid Gemini API key format. Must start with AIza',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.user.id, {
      anthropicApiKey: apiKey,
      aiProvider: aiProvider || 'claude',
    });

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/user/api-key:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to update API key',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.user.id, {
      $unset: { anthropicApiKey: 1, aiProvider: 1 },
    });

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'API key removed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/api-key:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to remove API key',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
