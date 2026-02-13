const API_BASE_URL = 'http://localhost:8000';

export interface Course {
  id: string;
  name: string;
}

export interface CourseCreate {
  course_id: string;
  course_name: string;
}

export interface CourseResponse extends CourseCreate {
  id: string;
}

// Note interfaces
export interface NoteCreate {
  notes: string;
  folder_id?: string;
}

export interface NoteUpdate {
  notes?: string;
  folder_id?: string;
}

export interface NoteResponse {
  id: string;
  notes: string;
  folder_id?: string;
}

// Folder interfaces
export interface FolderCreate {
  folder_name: string;
}

export interface FolderUpdate {
  folder_name?: string;
}

export interface FolderResponse {
  id: string;
  folder_name: string;
}

// Agent chat interfaces
export interface ConversationResponse {
  message?: string;
  [key: string]: unknown;
}

// For backwards compatibility in the chat component
export interface Message {
  role: string;
  content: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Course API methods
  async getCourses(): Promise<CourseResponse[]> {
    return this.request<CourseResponse[]>('/api/courses');
  }

  async getCourse(courseId: string): Promise<CourseResponse> {
    return this.request<CourseResponse>(`/api/courses/${courseId}`);
  }

  async createCourse(course: CourseCreate): Promise<CourseResponse> {
    return this.request<CourseResponse>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(course),
    });
  }

  async updateCourse(courseId: string, course: Partial<CourseCreate>): Promise<CourseResponse> {
    return this.request<CourseResponse>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(course),
    });
  }

  async deleteCourse(courseId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  async getCoursesForDropdown(): Promise<Course[]> {
    return this.request<Course[]>('/api/courses/dropdown/options');
  }

  // Slides API methods
  async getSlidesByCourse(courseId: string): Promise<{ slides: Array<{ id: string; course_id: string; course_name: string; filename: string; title: string; text_content: string }>, total: number }> {
    return this.request(`/api/slides/${courseId}`);
  }

  async uploadPdf(file: File, courseId: string, courseName: string, title: string): Promise<{ message: string; document_id: string; course_id: string; course_name: string; title: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId);
    formData.append('course_name', courseName);
    formData.append('title', title);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Note API methods
  async getNotes(): Promise<NoteResponse[]> {
    return this.request<NoteResponse[]>('/api/notes');
  }

  async getNote(noteId: string): Promise<NoteResponse> {
    return this.request<NoteResponse>(`/api/notes/${noteId}`);
  }

  async createNote(note: NoteCreate): Promise<NoteResponse> {
    return this.request<NoteResponse>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async updateNote(noteId: string, note: NoteUpdate): Promise<NoteResponse> {
    return this.request<NoteResponse>(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(note),
    });
  }

  async deleteNote(noteId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // Folder API methods
  async getFolders(): Promise<FolderResponse[]> {
    return this.request<FolderResponse[]>('/api/folders');
  }

  async getFolder(folderId: string): Promise<FolderResponse> {
    return this.request<FolderResponse>(`/api/folders/${folderId}`);
  }

  async createFolder(folder: FolderCreate): Promise<FolderResponse> {
    return this.request<FolderResponse>('/api/folders', {
      method: 'POST',
      body: JSON.stringify(folder),
    });
  }

  async updateFolder(folderId: string, folder: FolderUpdate): Promise<FolderResponse> {
    return this.request<FolderResponse>(`/api/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(folder),
    });
  }

  async deleteFolder(folderId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  async deleteSlide(documentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/slides/${documentId}`, {
      method: 'DELETE',
    });
  }

  async getPdfBinary(documentId: string): Promise<{ document_id: string; filename: string; pdf_binary: string; pdf_size: number; title: string }> {
    return this.request(`/api/pdf/${documentId}`);
  }

  // Agent chat API methods - call via Next.js API route to avoid CORS
  async sendAgentConversation(input: string): Promise<ConversationResponse> {
    
    return this.request<ConversationResponse>('/api/agent-chat', {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }
}

export const apiService = new ApiService();