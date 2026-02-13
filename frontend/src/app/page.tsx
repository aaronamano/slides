"use client";

import { useState, useEffect } from "react";
import { apiService, Course, NoteResponse, FolderResponse } from "@/services/api";
import AgentChat from "@/components/AgentChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TabType = "slides" | "upload" | "addCourse" | "notes";

interface SlideData {
  id: string;
  title: string;
  filename: string;
  has_binary?: boolean;
  text_content: string;
}

interface CourseWithSlides extends Course {
  slides?: { title: string; pdfUrl: string }[];
}

const colorTabs = [
  { id: "slides" as TabType, label: "Slides", color: "#0B64DD" },
  { id: "upload" as TabType, label: "Upload", color: "#BC1E70" },
  { id: "addCourse" as TabType, label: "Add Course", color: "#008B87" },
  { id: "notes" as TabType, label: "Notes", color: "#008A5E" }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("slides");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLeftNav, setShowLeftNav] = useState(true);
  const [showAgentChat, setShowAgentChat] = useState(true);

  const [courses, setCourses] = useState<CourseWithSlides[]>([]);
  const [slidesData, setSlidesData] = useState<{ [key: string]: SlideData[] }>({});
  const [pdfDataUrls, setPdfDataUrls] = useState<{ [key: string]: string }>({});

  const [uploadForm, setUploadForm] = useState({
    title: "",
    courseId: "",
    pdfFile: null as File | null
  });

  const [courseForm, setCourseForm] = useState({
    id: "",
    name: ""
  });

  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteForm, setNoteForm] = useState({
    notes: "",
    folder_id: ""
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [, setFoldersLoading] = useState(false);
  const [folderForm, setFolderForm] = useState({
    name: ""
  });
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNote, setSelectedNote] = useState<NoteResponse | null>(null);
  const [showAddToFolder, setShowAddToFolder] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === "notes") {
      fetchNotes();
      fetchFolders();
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
      const slides = await apiService.getSlidesByCourse(courseId) as { slides?: SlideData[] };
      setSlidesData(prev => ({
        ...prev,
        [courseId]: slides.slides || []
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
      await fetchCourses();
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
      await apiService.createNote({ 
        notes: noteForm.notes,
        folder_id: noteForm.folder_id || undefined
      });
      setSuccess("Note created successfully!");
      setNoteForm({ notes: "", folder_id: "" });
      await fetchNotes();
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
      await fetchNotes();
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
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const fetchFolders = async () => {
    try {
      setFoldersLoading(true);
      const foldersData = await apiService.getFolders();
      setFolders(foldersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch folders");
    } finally {
      setFoldersLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) {
      setError("Please enter a folder name");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.createFolder({ folder_name: folderForm.name });
      setSuccess("Folder created successfully!");
      setFolderForm({ name: "" });
      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  const handleUpdateFolder = async (folderId: string, updatedName: string) => {
    if (!updatedName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.updateFolder(folderId, { folder_name: updatedName });
      setSuccess("Folder updated successfully!");
      setEditingFolder(null);
      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? Notes in this folder will not be deleted but will become unassigned.")) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.deleteFolder(folderId);
      setSuccess("Folder deleted successfully!");
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(folderId);
      setExpandedFolders(newExpanded);
      if (selectedNote && folders.find(f => f.id === folderId)) {
        setSelectedNote(null);
      }
      await fetchFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleAddNoteToFolder = async (noteId: string, folderId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await apiService.updateNote(noteId, { folder_id: folderId });
      setSuccess("Note added to folder!");
      setShowAddToFolder(null);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note to folder");
    }
  };

  const handleDeleteSlide = async (documentId: string, courseId: string) => {
    if (!confirm("Are you sure you want to delete this slide?")) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await apiService.deleteSlide(documentId);
      setSuccess("Slide deleted successfully!");
      await fetchSlidesForCourse(courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete slide");
    }
  };

  const loadPdfBinary = async (slideId: string, documentId: string): Promise<string> => {
    if (pdfDataUrls[documentId]) {
      return pdfDataUrls[documentId];
    }

    try {
      const pdfData = await apiService.getPdfBinary(documentId);
      const base64Content = pdfData.pdf_binary;
      
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      
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

  if (loading && courses.length === 0) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div 
        className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0"
        style={{ backgroundColor: "oklch(0.12 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}
      >
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLeftNav(!showLeftNav)}
            style={{ 
              backgroundColor: showLeftNav ? "#0B64DD" : "transparent",
              color: showLeftNav ? "white" : "oklch(0.7 0 0)"
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Menu
          </Button>
          <span className="text-lg font-bold" style={{ color: "#0B64DD" }}>SlideES</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAgentChat(!showAgentChat)}
          style={{ 
            backgroundColor: showAgentChat ? "#BC1E70" : "transparent",
            color: showAgentChat ? "white" : "oklch(0.7 0 0)"
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Agent
        </Button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {showLeftNav && (
          <div 
            className="w-44 flex flex-col items-center py-6 space-y-3 border-r flex-shrink-0"
            style={{ backgroundColor: "oklch(0.12 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}
          >
            {colorTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-36 h-12 rounded-xl flex items-center justify-center transition-all font-medium ${
                  activeTab === tab.id
                    ? "shadow-lg"
                    : "hover:bg-muted/50"
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? tab.color : "transparent",
                  color: activeTab === tab.id ? "white" : "oklch(0.7 0 0)",
                  boxShadow: activeTab === tab.id ? `0 4px 20px ${tab.color}40` : "none",
                }}
              >
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
          )}
          
          <div className="flex-1 p-6 overflow-auto">
        {error && (
          <div 
            className="mb-4 p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: "#C61E2540", border: "1px solid #C61E25" }}
          >
            <span style={{ color: "#FF6B6B" }}>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-xl hover:opacity-80"
              style={{ color: "#FF6B6B" }}
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div 
            className="mb-4 p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: "#008A5E40", border: "1px solid #008A5E" }}
          >
            <span style={{ color: "#4ADE80" }}>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-4 text-xl hover:opacity-80"
              style={{ color: "#4ADE80" }}
            >
              ×
            </button>
          </div>
        )}

        {activeTab === "slides" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "oklch(0.985 0 0)" }}>Slides</h2>
            {courses.length === 0 ? (
              <Card style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
                <CardContent className="pt-6 text-center">
                  <div className="text-muted-foreground">No courses found. Add a course to get started.</div>
                </CardContent>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.id} style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle style={{ color: "oklch(0.985 0 0)" }}>{course.name}</CardTitle>
                        <CardDescription className="text-muted-foreground">ID: {course.id}</CardDescription>
                      </div>
                      <Badge style={{ backgroundColor: "#008B87", color: "white" }}>
                        {slidesData[course.id]?.length || 0} slides
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  {expandedCourses.has(course.id) && slidesData[course.id] && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        {slidesData[course.id].length === 0 ? (
                          <div className="text-muted-foreground text-sm py-4">
                            No slides found for this course.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {slidesData[course.id].map((slide: SlideData, index: number) => (
                              <div 
                                key={slide.id || index} 
                                className="rounded-lg border overflow-hidden"
                                style={{ borderColor: "oklch(1 0 0 / 10%)" }}
                              >
                                <button
                                  onClick={() => toggleSlide(`${course.id}-${slide.id || index}`, slide.id, slide.has_binary || false)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                  <span className="text-sm" style={{ color: "oklch(0.9 0 0)" }}>{slide.title}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {expandedSlides.has(`${course.id}-${slide.id || index}`) ? "▼" : "▶"}
                                  </span>
                                </button>
                                
                                {expandedSlides.has(`${course.id}-${slide.id || index}`) && (
                                  <div className="p-4 border-t" style={{ borderColor: "oklch(1 0 0 / 10%)", backgroundColor: "oklch(0.1 0 0)" }}>
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="text-sm text-muted-foreground">PDF Desktop View</div>
                                      <div className="flex items-center space-x-3">
                                        <div className="text-xs text-muted-foreground">
                                          Filename: {slide.filename}
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => handleDeleteSlide(slide.id, course.id)}
                                          style={{ backgroundColor: "#C61E25" }}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    <div 
                                      className="rounded-lg overflow-hidden border"
                                      style={{ borderColor: "oklch(1 0 0 / 10%)" }}
                                    >
                                      <div className="h-96">
                                        {(slide.has_binary && pdfDataUrls[slide.id]) ? (
                                          <iframe
                                            src={pdfDataUrls[slide.id]}
                                            className="w-full h-full"
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
                                          <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <div className="text-center">
                                              <div className="text-lg mb-2">Loading PDF...</div>
                                              <div className="text-sm">Retrieving PDF from database</div>
                                            </div>
                                          </div>
                                        ) : (
                                          <iframe
                                            src={`http://localhost:8001/api/files/${slide.filename}`}
                                            className="w-full h-full"
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
                                        
                                        <div className="pdf-error hidden items-center justify-center h-full text-muted-foreground p-4" style={{ backgroundColor: "oklch(0.15 0 0)" }}>
                                          <div className="text-center">
                                            <div className="text-lg mb-2">PDF Not Available</div>
                                            <div className="text-sm mb-4">The original PDF file is not accessible</div>
                                            <div 
                                              className="rounded-lg p-4 max-h-64 overflow-auto text-left border"
                                              style={{ backgroundColor: "oklch(0.1 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}
                                            >
                                              <div className="text-sm font-mono whitespace-pre-wrap" style={{ color: "oklch(0.9 0 0)" }}>
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
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold" style={{ color: "oklch(0.985 0 0)" }}>Upload Slide</h2>
            <Card style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                    Title
                  </label>
                  <Input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Enter slide title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                    Course
                  </label>
                  <select
                    value={uploadForm.courseId}
                    onChange={(e) => setUploadForm({ ...uploadForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
                    style={{ borderColor: "oklch(1 0 0 / 15%)" }}
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
                  <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
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
                      className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg"
                      style={{ 
                        background: "linear-gradient(135deg, #BC1E70, #0B64DD)", 
                        color: "white" 
                      }}
                    >
                      Choose File
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {uploadForm.pdfFile ? uploadForm.pdfFile.name : "No file selected"}
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={handleUpload}
                  disabled={!uploadForm.title || !uploadForm.courseId || !uploadForm.pdfFile}
                  className="w-full"
                  style={{ backgroundColor: "#BC1E70" }}
                >
                  Upload Slide
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "addCourse" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold" style={{ color: "oklch(0.985 0 0)" }}>Add New Course</h2>
            <Card style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                    Course ID
                  </label>
                  <Input
                    type="text"
                    value={courseForm.id}
                    onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
                    placeholder="e.g., CS101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                    Course Name
                  </label>
                  <Input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                
                <Button
                  onClick={handleAddCourse}
                  disabled={!courseForm.id || !courseForm.name}
                  className="w-full"
                  style={{ backgroundColor: "#008B87" }}
                >
                  Add Course
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="flex h-full gap-4">
            <div className="w-72 flex-shrink-0">
              <h2 className="text-xl font-bold mb-4" style={{ color: "oklch(0.985 0 0)" }}>Notes</h2>
              
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  type="text"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  placeholder="New folder..."
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <Button
                  size="icon"
                  onClick={handleCreateFolder}
                  disabled={!folderForm.name.trim()}
                  style={{ backgroundColor: "#008A5E" }}
                >
                  +
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedNote(null); setExpandedFolders(new Set()); }}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      !selectedNote && expandedFolders.size === 0 
                        ? "bg-muted" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>All Notes</span>
                    <span className="ml-auto text-xs text-muted-foreground">{notes.filter(n => !n.folder_id).length}</span>
                  </button>

                  {folders.map((folder) => {
                    const folderNotes = notes.filter(n => n.folder_id === folder.id);
                    const isExpanded = expandedFolders.has(folder.id);
                    
                    return (
                      <div key={folder.id}>
                        {editingFolder === folder.id ? (
                          <div className="flex items-center space-x-1 px-2">
                            <Input
                              type="text"
                              defaultValue={folder.folder_name}
                              className="h-8"
                              id={`edit-folder-${folder.id}`}
                              onKeyPress={(e) => e.key === 'Enter' && handleUpdateFolder(folder.id, (e.target as HTMLInputElement).value)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const input = document.getElementById(`edit-folder-${folder.id}`) as HTMLInputElement;
                                handleUpdateFolder(folder.id, input.value);
                              }}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingFolder(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center group">
                              <button
                                onClick={() => toggleFolder(folder.id)}
                                className="flex-1 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted/50 transition-colors"
                                style={{ color: "oklch(0.9 0 0)" }}
                              >
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-4 h-4" style={{ color: "#FACB3D" }} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                                <span className="truncate">{folder.folder_name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{folderNotes.length}</span>
                              </button>
                              <div className="hidden group-hover:flex items-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowAddToFolder(folder.id)}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingFolder(folder.id)}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteFolder(folder.id)}
                                  style={{ color: "#C61E25" }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="ml-6 space-y-1">
                                {folderNotes.length === 0 ? (
                                  <div className="text-xs text-muted-foreground px-3 py-1">No pages</div>
                                ) : (
                                  folderNotes.map((note) => (
                                    <button
                                      key={note.id}
                                      onClick={() => setSelectedNote(note)}
                                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                                        selectedNote?.id === note.id
                                          ? "bg-primary text-primary-foreground"
                                          : "hover:bg-muted/50"
                                      }`}
                                    >
                                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="truncate">{note.notes.substring(0, 30)}{note.notes.length > 30 ? '...' : ''}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1">
              {selectedNote ? (
                <div className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedNote(null)}
                      className="text-muted-foreground"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNote(selectedNote.id)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        style={{ color: "#C61E25" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  
                  {editingNote === selectedNote.id ? (
                    <div className="space-y-3">
                      <textarea
                        defaultValue={selectedNote.notes}
                        className="w-full px-4 py-3 rounded-lg border bg-background text-foreground text-lg min-h-[400px]"
                        style={{ borderColor: "oklch(1 0 0 / 15%)" }}
                        id={`edit-note-${selectedNote.id}`}
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            const textarea = document.getElementById(`edit-note-${selectedNote.id}`) as HTMLTextAreaElement;
                            handleUpdateNote(selectedNote.id, textarea.value);
                          }}
                          style={{ backgroundColor: "#008A5E" }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingNote(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Card style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
                      <CardContent className="pt-6">
                        <p className="whitespace-pre-wrap text-lg" style={{ color: "oklch(0.985 0 0)" }}>{selectedNote.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="max-w-2xl space-y-6">
                  <Card style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}>
                    <CardHeader>
                      <CardTitle style={{ color: "oklch(0.985 0 0)" }}>New Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                          Folder (Optional)
                        </label>
                        <select
                          value={noteForm.folder_id}
                          onChange={(e) => setNoteForm({ ...noteForm, folder_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
                          style={{ borderColor: "oklch(1 0 0 / 15%)" }}
                        >
                          <option value="">No folder</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.folder_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: "oklch(0.9 0 0)" }}>
                          Note Content
                        </label>
                        <textarea
                          value={noteForm.notes}
                          onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border bg-background text-foreground min-h-[200px]"
                          style={{ borderColor: "oklch(1 0 0 / 15%)" }}
                          placeholder="Start typing your note..."
                        />
                      </div>
                      
                      <Button
                        onClick={handleCreateNote}
                        disabled={!noteForm.notes.trim()}
                        className="w-full"
                        style={{ backgroundColor: "#0B64DD" }}
                      >
                        Create Note
                      </Button>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-lg font-semibold mb-4" style={{ color: "oklch(0.985 0 0)" }}>Unassigned Notes</h3>
                    {notesLoading ? (
                      <div className="text-muted-foreground">Loading...</div>
                    ) : notes.filter(n => !n.folder_id).length === 0 ? (
                      <div className="text-muted-foreground">No unassigned notes</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {notes.filter(n => !n.folder_id).map((note) => (
                          <Card 
                            key={note.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            style={{ backgroundColor: "oklch(0.15 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}
                            onClick={() => setSelectedNote(note)}
                          >
                            <CardContent className="pt-4">
                              <div 
                                className="text-sm font-medium mb-1 truncate"
                                style={{ color: "oklch(0.985 0 0)" }}
                              >
                                {note.notes.substring(0, 40)}{note.notes.length > 40 ? '...' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {note.notes}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showAddToFolder && (
          <Dialog open={true} onOpenChange={() => setShowAddToFolder(null)}>
            <DialogContent style={{ backgroundColor: "oklch(0.15 0 0)" }}>
              <DialogHeader>
                <DialogTitle style={{ color: "oklch(0.985 0 0)" }}>Add Note to Folder</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Select a note to add to this folder:
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-60 overflow-auto space-y-2 py-4">
                {notes.filter(n => !n.folder_id || n.folder_id !== showAddToFolder).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleAddNoteToFolder(note.id, showAddToFolder)}
                    className="w-full rounded-lg p-3 text-left transition-colors hover:bg-muted/50 border"
                    style={{ borderColor: "oklch(1 0 0 / 10%)" }}
                  >
                    <div className="text-sm truncate" style={{ color: "oklch(0.985 0 0)" }}>
                      {note.notes.substring(0, 50)}{note.notes.length > 50 ? '...' : ''}
                    </div>
                  </button>
                ))}
                {notes.filter(n => !n.folder_id || n.folder_id !== showAddToFolder).length === 0 && (
                  <div className="text-muted-foreground text-center py-4">No notes available to add</div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAddToFolder(null)}
                className="w-full"
              >
                Cancel
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {showAgentChat && (
        <div 
          className="w-80 border-l flex-shrink-0"
          style={{ backgroundColor: "oklch(0.12 0 0)", borderColor: "oklch(1 0 0 / 10%)" }}
        >
          <AgentChat />
        </div>
      )}
      </div>
    </div>
  );
}
