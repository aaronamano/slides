from typing import List, Optional
from pydantic import BaseModel
from mongo_client import MongoClient
from bson import ObjectId

class CourseBase(BaseModel):
    course_id: str
    course_name: str

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_name: Optional[str] = None

class CourseResponse(CourseBase):
    id: str
    
    class Config:
        from_attributes = True

class CourseService:
    def __init__(self):
        self.collection = None
    
    async def _get_collection(self):
        if self.collection is None:
            self.collection = await MongoClient.get_courses_collection()
        return self.collection
    
    async def get_all_courses(self) -> List[CourseResponse]:
        """Get all courses"""
        try:
            collection = await self._get_collection()
            courses = []
            async for course in collection.find():
                course['id'] = str(course['_id'])
                del course['_id']
                courses.append(CourseResponse(**course))
            return courses
        except Exception as e:
            raise Exception(f"Error fetching courses: {str(e)}")
    
    async def get_course_by_id(self, course_id: str) -> Optional[CourseResponse]:
        """Get a specific course by course_id"""
        try:
            collection = await self._get_collection()
            course = await collection.find_one({"course_id": course_id})
            if course:
                course['id'] = str(course['_id'])
                del course['_id']
                return CourseResponse(**course)
            return None
        except Exception as e:
            raise Exception(f"Error fetching course: {str(e)}")
    
    async def create_course(self, course: CourseCreate) -> CourseResponse:
        """Create a new course"""
        try:
            # Check if course_id already exists
            existing = await self.get_course_by_id(course.course_id)
            if existing:
                raise ValueError(f"Course with ID '{course.course_id}' already exists")
            
            collection = await self._get_collection()
            course_doc = {
                "course_id": course.course_id,
                "course_name": course.course_name
            }
            
            result = await collection.insert_one(course_doc)
            
            # Retrieve the inserted document
            inserted_doc = await collection.find_one({"_id": result.inserted_id})
            inserted_doc['id'] = str(inserted_doc['_id'])
            del inserted_doc['_id']
            
            return CourseResponse(**inserted_doc)
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Error creating course: {str(e)}")
    
    async def update_course(self, course_id: str, course_update: CourseUpdate) -> Optional[CourseResponse]:
        """Update an existing course"""
        try:
            # Check if course exists
            existing = await self.get_course_by_id(course_id)
            if not existing:
                return None
            
            collection = await self._get_collection()
            update_data = {}
            
            if course_update.course_name:
                update_data["course_name"] = course_update.course_name
            
            if update_data:
                await collection.update_one(
                    {"course_id": course_id}, 
                    {"$set": update_data}
                )
            
            return await self.get_course_by_id(course_id)
        except Exception as e:
            raise Exception(f"Error updating course: {str(e)}")
    
    async def delete_course(self, course_id: str) -> bool:
        """Delete a course"""
        try:
            # Check if course exists
            existing = await self.get_course_by_id(course_id)
            if not existing:
                return False
            
            collection = await self._get_collection()
            result = await collection.delete_one({"course_id": course_id})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Error deleting course: {str(e)}")
    
    async def get_courses_for_dropdown(self) -> List[dict]:
        """Get courses formatted for dropdown options"""
        try:
            courses = await self.get_all_courses()
            return [
                {"id": course.course_id, "name": course.course_name}
                for course in courses
            ]
        except Exception as e:
            raise Exception(f"Error fetching courses for dropdown: {str(e)}")