from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    department_id: int | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    department_id: int | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool
    department_id: int | None = None

    class Config:
        from_attributes = True