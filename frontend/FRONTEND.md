# Set up frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

# Run UI
```bash
pnpm run dev
```

# Folder Structure
```
└── frontend
    └── public
        ├── file.svg
        ├── globe.svg
        ├── next.svg
        ├── vercel.svg
        ├── window.svg
    └── src
        └── app
            └── api
                └── agent-chat
                    ├── route.ts
            ├── favicon.ico
            ├── globals.css
            ├── layout.tsx
            ├── page.tsx
        └── components
            └── ui
                ├── badge.tsx
                ├── button.tsx
                ├── card.tsx
                ├── dialog.tsx
                ├── input.tsx
                ├── scroll-area.tsx
                ├── select.tsx
                ├── separator.tsx
            ├── AgentChat.tsx
        └── lib
            ├── utils.ts
        └── services
            ├── api.ts
    ├── .gitignore
    ├── components.json
    ├── eslint.config.mjs
    ├── FRONTEND.md
    ├── next.config.ts
    ├── package.json
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml
    ├── postcss.config.mjs
    ├── README.md
    └── tsconfig.json
```