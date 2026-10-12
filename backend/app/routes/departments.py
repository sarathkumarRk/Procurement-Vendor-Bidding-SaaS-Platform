from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.department import Department
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/departments", tags=["Departments"])


# Create Department - Admin Only
@router.post("/", response_model=DepartmentResponse, status_code=201)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = db.query(Department).filter(
        Department.name == data.name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    department = Department(
        name=data.name,
        description=data.description,
    )

    db.add(department)
    db.commit()
    db.refresh(department)

    return department


# List Departments - All Authenticated Users
@router.get("/", response_model=list[DepartmentResponse])
def get_departments(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if page < 1 or limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Invalid pagination values")

    return (
        db.query(Department)
        .order_by(Department.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# Get Department by ID
@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    department = db.query(Department).filter(
        Department.id == department_id
    ).first()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    return department


# Update Department - Admin Only
@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    department = db.query(Department).filter(
        Department.id == department_id
    ).first()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing = db.query(Department).filter(
            Department.name == update_data["name"],
            Department.id != department_id,
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Department name already exists",
            )

    for key, value in update_data.items():
        setattr(department, key, value)

    db.commit()
    db.refresh(department)

    return department


# Delete Department - Admin Only
@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    department = db.query(Department).filter(
        Department.id == department_id
    ).first()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    if department.users or department.rfqs:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a department linked to users or RFQs",
        )

    db.delete(department)
    db.commit()

    return {"message": "Department deleted successfully"}