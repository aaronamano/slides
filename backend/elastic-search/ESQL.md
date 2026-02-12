# Elastic Search Agent Tools

## Tool 1: Content Filtering Agent

Filters lecture content based on course and search criteria.

```sql
FROM lecture-slides-index
| WHERE course_id == "{course_id}"
| WHERE text_content LIKE "*{search_term}*"
| SORT _score DESC
| LIMIT 10
| KEEP course_name, filename, title, text_content, pdf_size, has_binary
| EVAL snippet = SUBSTRING(text_content, 1, 300)
```

## Tool 2: Personalized Notes Generation Agent

Generates customized study notes from slide content.

```sql
FROM lecture-slides-index
| WHERE course_id == "{course_id}"
| WHERE text_content LIKE "*{topic}*"
| LIMIT 15
| KEEP title, text_content, course_name, filename
| EVAL summary = SUBSTRING(text_content, 1, 500)
```