"""Typed API contracts shared by FastAPI and the OpenAPI schema."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class CollectionCreate(APIModel):
    name: str = Field(min_length=3, max_length=63)


class CollectionRename(APIModel):
    new_name: str = Field(min_length=3, max_length=63)


class CollectionDelete(APIModel):
    confirmation: str = Field(min_length=1, max_length=63)


class ConversationCreate(APIModel):
    name: Optional[str] = Field(default=None, max_length=200)


class ChatRequest(APIModel):
    question: str = Field(min_length=1, max_length=20000)
    conversation_id: Optional[str] = None
    query_transformation: Optional[bool] = None
    query_expansion: Optional[bool] = None


class RatingRequest(APIModel):
    rating: Literal["like", "dislike"]
    comment: Optional[str] = Field(default=None, max_length=5000)


class PromptCreate(APIModel):
    name: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=50000)
    enabled: bool = True


class PromptUpdate(APIModel):
    enabled: bool


class SQLQueryRequest(APIModel):
    file_id: int
    query: str = Field(min_length=1, max_length=50000)


class NaturalLanguageQueryRequest(APIModel):
    file_id: int
    question: str = Field(min_length=1, max_length=20000)
