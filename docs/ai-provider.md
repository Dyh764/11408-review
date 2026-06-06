# AI Provider

`AI_PROVIDER` controls the optional learning-analysis provider.

Valid values:

- `gemini`
- `deepseek`
- `none`

Gemini configuration:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

DeepSeek configuration:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
```

`none` mode disables AI learning analysis:

```env
AI_PROVIDER=none
```

Upload, JSON import, the question bank, answer reveal, review, reports, export, and soft delete remain usable when no AI key is configured.

Do not put API keys in source code, README examples, screenshots, or chat messages. Configure them only in local `.env` files or Vercel environment variables.

AI calls are manual enhancements. The app does not automatically call providers at high frequency, does not generate images, does not delete questions, does not overwrite user notes, and does not overwrite verified question text.

Gemini free quota and model availability are controlled by Google and may change; check the official Google AI Studio or Gemini API documentation before relying on a quota.
