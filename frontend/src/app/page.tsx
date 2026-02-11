"use client";

import { useState } from "react";

type TabType = "slides" | "upload" | "addCourse";

interface Course {
  id: string;
  name: string;
  slides?: { title: string; pdfUrl: string }[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("slides");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());

  // Mock data for demonstration
  const [courses, setCourses] = useState<Course[]>([
    {
      id: "CS101",
      name: "Introduction to Computer Science",
      slides: [
        { title: "Chapter 1: Basics", pdfUrl: "#" },
        { title: "Chapter 2: Variables", pdfUrl: "#" },
        { title: "Chapter 3: Functions", pdfUrl: "#" }
      ]
    },
    {
      id: "CS202",
      name: "Data Structures",
      slides: [
        { title: "Arrays and Lists", pdfUrl: "#" },
        { title: "Trees and Graphs", pdfUrl: "#" }
      ]
    }
  ]);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    courseId: "",
    pdfFile: null as File | null
  });

  const [courseForm, setCourseForm] = useState({
    id: "",
    name: ""
  });

  const toggleCourse = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
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

  const handleAddCourse = () => {
    if (courseForm.id && courseForm.name) {
      setCourses([...courses, { id: courseForm.id, name: courseForm.name }]);
      setCourseForm({ id: "", name: "" });
    }
  };

  const leftTabs = [
    { id: "slides" as TabType, label: "Slides", icon: "📊" },
    { id: "upload" as TabType, label: "Upload", icon: "📤" },
    { id: "addCourse" as TabType, label: "Add Course", icon: "➕" }
  ];

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
        {activeTab === "slides" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Slides</h2>
            {courses.map((course) => (
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
                
                {expandedCourses.has(course.id) && course.slides && (
                  <div className="border-t border-gray-200">
                    {course.slides.map((slide, index) => (
                      <div key={index} className="border-b border-gray-100 last:border-b-0">
                        <button
                          onClick={() => toggleSlide(`${course.id}-${index}`)}
                          className="w-full px-8 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{slide.title}</span>
                          <span className="text-gray-400">
                            {expandedSlides.has(`${course.id}-${index}`) ? "▼" : "▶"}
                          </span>
                        </button>
                        
                        {expandedSlides.has(`${course.id}-${index}`) && (
                          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                            <div className="text-sm text-gray-600 mb-2">PDF Desktop View</div>
                            <div className="bg-white border border-gray-300 rounded p-4 h-64 flex items-center justify-center">
                              <span className="text-gray-400">PDF Preview: {slide.title}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
                
                <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
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
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Course
                </button>
              </div>
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