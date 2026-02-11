"use client";

import { useState, useEffect } from "react";
import { apiService, CourseResponse, Course, NoteResponse, NoteCreate, NoteUpdate } from "@/services/api";

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

  // State for courses and their slides
  const [courses, setCourses] = useState<CourseWithSlides[]>([]);
  const [slidesData, setSlidesData] = useState<{ [key: string]: any[] }>({});

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

  const toggleSlide = (slideId: string) => {
    const newExpanded = new Set(expandedSlides);
    if (newExpanded.has(slideId)) {
      newExpanded.delete(slideId);
    } else {
      newExpanded.add(slideId);
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
      await apiService.createCourse({
        course_id: courseForm.id,
        course_name: courseForm.name
      });
      
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
      await apiService.uploadPdf(
        uploadForm.pdfFile,
        uploadForm.courseId,
        courses.find(c => c.id === uploadForm.courseId)?.name || "",
        uploadForm.title
      );
      
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
      await apiService.createNote({ notes: noteForm.notes });
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
      await apiService.updateNote(noteId, { notes: updatedNotes });
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
      await apiService.deleteNote(noteId);
      await fetchNotes(); // Refresh notes list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const leftTabs = [
    { id: "slides" as TabType, label: "Slides", icon: "📊" },
    { id: "upload" as TabType, label: "Upload", icon: "📤" },
    { id: "addCourse" as TabType, label: "Add Course", icon: "➕" },
    { id: "notes" as TabType, label: "Notes", icon: "📝" }
  ];

  if (loading && courses.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Toggle Bar */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        {leftTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-colors ${
              activeTab === tab.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === "slides" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Slides</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-gray-500">No courses found. Add a course to get started.</div>
              </div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => toggleCourse(course.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">{course.name}</div>
                      <div className="text-sm text-gray-500">ID: {course.id}</div>
                    </div>
                    <span className="text-gray-400">
                      {expandedCourses.has(course.id) ? "▼" : "▶"}
                    </span>
                  </button>
                  
                  {expandedCourses.has(course.id) && slidesData[course.id] && (
                    <div className="border-t border-gray-200">
                      {slidesData[course.id].length === 0 ? (
                        <div className="px-8 py-4 text-gray-500 text-sm">
                          No slides found for this course.
                        </div>
                      ) : (
                        slidesData[course.id].map((slide: any, index: number) => (
                          <div key={slide.id || index} className="border-b border-gray-100 last:border-b-0">
                            <button
                              onClick={() => toggleSlide(`${course.id}-${slide.id || index}`)}
                              className="w-full px-8 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm text-gray-700">{slide.title}</span>
                              <span className="text-gray-400">
                                {expandedSlides.has(`${course.id}-${slide.id || index}`) ? "▼" : "▶"}
                              </span>
                            </button>
                            
                            {expandedSlides.has(`${course.id}-${slide.id || index}`) && (
                              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                                <div className="text-sm text-gray-600 mb-2">PDF Desktop View</div>
                                <div className="bg-white border border-gray-300 rounded p-4 h-64 flex items-center justify-center overflow-hidden">
                                  <div className="text-center">
                                    <div className="text-gray-400 text-sm mb-2">{slide.title}</div>
                                    <div className="text-gray-400 text-xs">
                                      Filename: {slide.filename}
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
            <h2 className="text-2xl font-bold text-gray-800">Upload Slide</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter slide title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    value={uploadForm.courseId}
                    onChange={(e) => setUploadForm({ ...uploadForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadForm({ ...uploadForm, pdfFile: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.title || !uploadForm.courseId || !uploadForm.pdfFile}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Upload Slide
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "addCourse" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Add New Course</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course ID
                  </label>
                  <input
                    type="text"
                    value={courseForm.id}
                    onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CS101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                
                <button
                  onClick={handleAddCourse}
                  disabled={!courseForm.id || !courseForm.name}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Course
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Notes</h2>
            
            {/* Create New Note */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={noteForm.notes}
                    onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Enter your note content here..."
                  />
                </div>
                
                <button
                  onClick={handleCreateNote}
                  disabled={!noteForm.notes.trim()}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Note
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Notes</h3>
              {notesLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading notes...</div>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No notes found. Create your first note above.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                      {editingNote === note.id ? (
                        <div className="space-y-3">
                          <textarea
                            defaultValue={note.notes}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            id={`edit-${note.id}`}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const textarea = document.getElementById(`edit-${note.id}`) as HTMLTextAreaElement;
                                handleUpdateNote(note.id, textarea.value);
                              }}
                              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNote(null)}
                              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-700 whitespace-pre-wrap mb-3">{note.notes}</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingNote(note.id)}
                              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm"
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
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Agent Chat</h3>
        </div>
        <div className="flex-1 p-4">
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <div>Chat interface will be implemented here</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}