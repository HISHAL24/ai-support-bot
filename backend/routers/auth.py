from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings, db
from bson import ObjectId

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ========================
# MODELS
# ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"   # safer default = user


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


# ========================
# AUTH UTILITIES
# ========================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ========================
# CURRENT USER
# ========================

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = await db.users.find_one({"email": email})

    if user is None:
        raise credentials_exception

    user["_id"] = str(user["_id"])
    return user


# ========================
# ROLE-BASED ACCESS CONTROL
# ========================

def require_roles(allowed_roles: list):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
    return role_checker


# ========================
# REGISTER
# ========================

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)

    user_doc = {
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }

    result = await db.users.insert_one(user_doc)

    token = create_access_token({"sub": user_data.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }
    }


# ========================
# LOGIN
# ========================

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username})

    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user["email"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }


# ========================
# CURRENT USER PROFILE
# ========================

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"]
    }


# ========================
# ROLE PROTECTED EXAMPLE ROUTES
# ========================

@router.get("/admin-only")
async def admin_only_route(
    current_user: dict = Depends(require_roles(["admin"]))
):
    return {"message": "Welcome Admin", "user": current_user}


@router.get("/user-area")
async def user_area(
    current_user: dict = Depends(require_roles(["admin", "user"]))
):
    return {"message": "User access granted", "user": current_user}
