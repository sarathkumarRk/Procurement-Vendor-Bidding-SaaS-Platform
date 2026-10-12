from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse, TokenResponse
from app.schemas.auth import UserLogin
from app.schemas.user import UserCreate
from app.security import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Admin Registration
@router.post("/register", response_model=UserResponse, status_code=201)
def register_admin(
    data: UserCreate,
    db: Session = Depends(get_db)
):
    # Allow registration only when no Admin exists yet
    admin_exists = db.query(User).filter(User.role == "ADMIN").first()

    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    admin = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="ADMIN",
        is_active=True,
        department_id=None
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin

# Login - All Roles
@router.post("/login", response_model=TokenResponse)
def login_user(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if (
        not user
        or not verify_password(
            data.password,
            user.hashed_password
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# Get Current User
@router.get("/me", response_model=UserResponse)
def get_current_user_details(
    current_user: User = Depends(get_current_user)
):
    return current_user