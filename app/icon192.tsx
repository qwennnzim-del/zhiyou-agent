import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundImage: 'linear-gradient(to bottom right, #4ade80, #3b82f6)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <svg viewBox="0 0 32 32" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M 11 7 L 27 7 L 23 13 L 21 13 L 17 19 L 25 19 L 21 25 L 5 25 L 9 19 L 11 19 L 15 13 L 7 13 Z" 
            fill="white" 
            stroke="white" 
            strokeWidth="1.5" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
