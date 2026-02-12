"use client";

import { useState, useEffect } from "react";
import { apiService, Course, NoteResponse } from "@/services/api";
import AgentChat from "@/components/AgentChat";

type TabType = "slides" | "upload" | "addCourse" | "notes";

interface CourseWithSlides extends Course {
  slides?: { title: string; pdfUrl: string }[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("slides");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for courses and their slides
  const [courses, setCourses] = useState<CourseWithSlides[]>([]);
  const [slidesData, setSlidesData] = useState<{ [key: string]: any[] }>({});
  const [pdfDataUrls, setPdfDataUrls] = useState<{ [key: string]: string }>({});

  // Form states
  const [uploadForm, setUploadForm] = useState({
    title: "",
    courseId: "",
    pdfFile: null as File | null
  });

  const [courseForm, setCourseForm] = useState({
    id: "",
    name: ""
  });

  // Notes state
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteForm, setNoteForm] = useState({
    notes: ""
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);





  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch notes when notes tab is activated
  useEffect(() => {
    if (activeTab === "notes") {
      fetchNotes();
    }
  }, [activeTab]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await apiService.getCoursesForDropdown();
      setCourses(coursesData.map(course => ({
        ...course,
        id: course.id,
        name: course.name,
        slides: []
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlidesForCourse = async (courseId: string) => {
    try {
      const slides = await apiService.getSlidesByCourse(courseId);
      setSlidesData(prev => ({
        ...prev,
        [courseId]: (slides as any).slides || []
      }));
    } catch (err) {
      console.error(`Failed to fetch slides for course ${courseId}:`, err);
      setSlidesData(prev => ({
        ...prev,
        [courseId]: []
      }));
    }
  };

  const toggleCourse = async (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
      // Fetch slides when expanding course
      if (!slidesData[courseId]) {
        await fetchSlidesForCourse(courseId);
      }
    }
    setExpandedCourses(newExpanded);
  };

  const toggleSlide = async (slideId: string, documentId: string, hasBinary: boolean) => {
    const newExpanded = new Set(expandedSlides);
    const slideKey = slideId;
    
    if (newExpanded.has(slideKey)) {
      newExpanded.delete(slideKey);
    } else {
      newExpanded.add(slideKey);
      
      // Load PDF binary data if available and not already loaded
      if (hasBinary && !pdfDataUrls[documentId]) {
        try {
          await loadPdfBinary(slideId, documentId);
        } catch (error) {
          console.error('Failed to load PDF:', error);
          setError('Failed to load PDF content');
        }
      }
    }
    setExpandedSlides(newExpanded);
  };

  const handleAddCourse = async () => {
    if (!courseForm.id || !courseForm.name) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.createCourse({
        course_id: courseForm.id,
        course_name: courseForm.name
      });
      
      setSuccess("Course added successfully!");
      setCourseForm({ id: "", name: "" });
      await fetchCourses(); // Refresh courses list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.courseId || !uploadForm.pdfFile) {
      setError("Please fill in all fields and select a file");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.uploadPdf(
        uploadForm.pdfFile,
        uploadForm.courseId,
        courses.find(c => c.id === uploadForm.courseId)?.name || "",
        uploadForm.title
      );
      
      setSuccess("Slide uploaded successfully!");
      setUploadForm({ title: "", courseId: "", pdfFile: null });
      // Refresh slides if the course is expanded
      if (expandedCourses.has(uploadForm.courseId)) {
        await fetchSlidesForCourse(uploadForm.courseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  const fetchNotes = async () => {
    try {
      setNotesLoading(true);
      const notesData = await apiService.getNotes();
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch notes");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteForm.notes.trim()) {
      setError("Please enter note content");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.createNote({ notes: noteForm.notes });
      setSuccess("Note created successfully!");
      setNoteForm({ notes: "" });
      await fetchNotes(); // Refresh notes list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    }
  };

  const handleUpdateNote = async (noteId: string, updatedNotes: string) => {
    if (!updatedNotes.trim()) {
      setError("Note content cannot be empty");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.updateNote(noteId, { notes: updatedNotes });
      setSuccess("Note updated successfully!");
      setEditingNote(null);
      await fetchNotes(); // Refresh notes list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.deleteNote(noteId);
      setSuccess("Note deleted successfully!");
      await fetchNotes(); // Refresh notes list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const loadPdfBinary = async (slideId: string, documentId: string): Promise<string> => {
    if (pdfDataUrls[documentId]) {
      return pdfDataUrls[documentId];
    }

    try {
      const pdfData = await apiService.getPdfBinary(documentId);
      const base64Content = pdfData.pdf_binary;
      
      // Convert base64 to blob and create object URL
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      
      // Cache the URL
      setPdfDataUrls(prev => ({
        ...prev,
        [documentId]: objectUrl
      }));
      
      return objectUrl;
    } catch (error) {
      console.error('Failed to load PDF binary:', error);
      throw error;
    }
  };





  const leftTabs = [
    { id: "slides" as TabType, label: "Slides" },
    { id: "upload" as TabType, label: "Upload" },
    { id: "addCourse" as TabType, label: "Add Course" },
    { id: "notes" as TabType, label: "Notes" }
  ];

  if (loading && courses.length === 0) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left Toggle Bar */}
      <div className="w-40 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 space-y-3">
        {leftTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-32 h-12 rounded-lg flex items-center justify-center transition-all ${
              activeTab === tab.id
                ? "gradient-primary text-white shadow-lg shadow-blue-500/25"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-400 hover:text-red-200 text-xl"
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-900/30 border border-green-700 text-green-300 rounded-lg flex items-center justify-between">
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-4 text-green-400 hover:text-green-200 text-xl"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === "slides" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Slides</h2>
            {courses.length === 0 ? (
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center">
                <div className="text-gray-400">No courses found. Add a course to get started.</div>
              </div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="bg-gray-900 rounded-lg border border-gray-700">
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
                  >
                    <div className="text-left">
                      <div className="font-semibold text-white">{course.name}</div>
                      <div className="text-sm text-gray-400">ID: {course.id}</div>
                    </div>
                    <span className="text-gray-500">
                      {expandedCourses.has(course.id) ? "▼" : "▶"}
                    </span>
                  </button>
                  
                  {expandedCourses.has(course.id) && slidesData[course.id] && (
                    <div className="border-t border-gray-700">
                      {slidesData[course.id].length === 0 ? (
                        <div className="px-8 py-4 text-gray-400 text-sm">
                          No slides found for this course.
                        </div>
                      ) : (
                        slidesData[course.id].map((slide: any, index: number) => (
                          <div key={slide.id || index} className="border-b border-gray-800 last:border-b-0">
                            <button
                              onClick={() => toggleSlide(`${course.id}-${slide.id || index}`, slide.id, slide.has_binary || false)}
                              className="w-full px-8 py-2 flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                              <span className="text-sm text-gray-300">{slide.title}</span>
                              <span className="text-gray-500">
                                {expandedSlides.has(`${course.id}-${slide.id || index}`) ? "▼" : "▶"}
                              </span>
                            </button>
                            
                            {expandedSlides.has(`${course.id}-${slide.id || index}`) && (
                              <div className="px-8 py-4 bg-gray-800 border-t border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="text-sm text-gray-400">PDF Desktop View</div>
                                  <div className="text-xs text-gray-500">
                                    Filename: {slide.filename}
                                  </div>
                                </div>
                                
                                <div className="bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
                                  <div className="h-96">
                                    {(slide.has_binary && pdfDataUrls[slide.id]) ? (
                                      <iframe
                                        src={pdfDataUrls[slide.id]}
                                        className="w-full h-full rounded-lg"
                                        title={slide.title}
                                        onError={(e) => {
                                          const target = e.target as HTMLIFrameElement;
                                          target.style.display = 'none';
                                          const errorDiv = target.parentElement?.querySelector('.pdf-error');
                                          if (errorDiv) {
                                            (errorDiv as HTMLElement).style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : slide.has_binary ? (
                                      <div className="flex items-center justify-center h-full text-gray-400">
                                        <div className="text-center">
                                          <div className="text-lg mb-2">Loading PDF...</div>
                                          <div className="text-sm">Retrieving PDF from database</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <iframe
                                        src={`http://localhost:8001/api/files/${slide.filename}`}
                                        className="w-full h-full rounded-lg"
                                        title={slide.title}
                                        onError={(e) => {
                                          const target = e.target as HTMLIFrameElement;
                                          target.style.display = 'none';
                                          const errorDiv = target.parentElement?.querySelector('.pdf-error');
                                          if (errorDiv) {
                                            (errorDiv as HTMLElement).style.display = 'flex';
                                          }
                                        }}
                                      />
                                    )}
                                    
                                    <div className="pdf-error hidden items-center justify-center h-full text-gray-400 bg-gray-800 rounded-lg">
                                      <div className="text-center p-4">
                                        <div className="text-lg mb-2">PDF Not Available</div>
                                        <div className="text-sm mb-4">The original PDF file is not accessible</div>
                                        <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 max-h-64 overflow-auto text-left">
                                          <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                                            {slide.text_content.substring(0, 500)}
                                            {slide.text_content.length > 500 ? '...' : ''}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Upload Slide</h2>
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter slide title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course
                  </label>
                  <select
                    value={uploadForm.courseId}
                    onChange={(e) => setUploadForm({ ...uploadForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PDF File
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadForm({ ...uploadForm, pdfFile: e.target.files?.[0] || null })}
                      className="hidden"
                      id="pdf-file-input"
                    />
                    <label
                      htmlFor="pdf-file-input"
                      className="px-4 py-2 bg-linear-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-full cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Choose File
                    </label>
                    <span className="text-sm text-gray-400">
                      {uploadForm.pdfFile ? uploadForm.pdfFile.name : "No file selected"}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.title || !uploadForm.courseId || !uploadForm.pdfFile}
                  className="w-full gradient-primary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-700 disabled:cursor-not-allowed disabled:hover:opacity-100"
                >
                  Upload Slide
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "addCourse" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Add New Course</h2>
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course ID
                  </label>
                  <input
                    type="text"
                    value={courseForm.id}
                    onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CS101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                
                <button
                  onClick={handleAddCourse}
                  disabled={!courseForm.id || !courseForm.name}
                  className="w-full gradient-secondary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-700 disabled:cursor-not-allowed disabled:hover:opacity-100"
                >
                  Add Course
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Notes</h2>
            
            {/* Create New Note */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={noteForm.notes}
                    onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Enter your note content here..."
                  />
                </div>
                
                <button
                  onClick={handleCreateNote}
                  disabled={!noteForm.notes.trim()}
                  className="w-full gradient-accent text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:bg-gray-700 disabled:cursor-not-allowed disabled:hover:opacity-100"
                >
                  Create Note
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Existing Notes</h3>
              {notesLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">Loading notes...</div>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">No notes found. Create your first note above.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                      {editingNote === note.id ? (
                        <div className="space-y-3">
                          <textarea
                            defaultValue={note.notes}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            id={`edit-${note.id}`}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const textarea = document.getElementById(`edit-${note.id}`) as HTMLTextAreaElement;
                                handleUpdateNote(note.id, textarea.value);
                              }}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNote(null)}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-300 whitespace-pre-wrap mb-3">{note.notes}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingNote(note.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Toggle Bar - Agent Chat Interface */}
      <div className="w-80 bg-gray-900 border-l border-gray-700">
        <AgentChat />
      </div>
    </div>
  );
}